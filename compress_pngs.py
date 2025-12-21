"""
Lossless PNG Compression Script
Compresses all PNG files in the project using PIL/Pillow with maximum compression.
This reduces file sizes without any quality loss.
"""

import os
from PIL import Image
from pathlib import Path

def compress_png(file_path):
    """Compress a single PNG file losslessly."""
    try:
        # Open the image
        img = Image.open(file_path)
        
        # Get original file size
        original_size = os.path.getsize(file_path)
        
        # Save with maximum compression (compress_level=9)
        # This is lossless - no quality loss
        img.save(file_path, 'PNG', optimize=True, compress_level=9)
        
        # Get new file size
        new_size = os.path.getsize(file_path)
        
        # Calculate savings
        saved = original_size - new_size
        percent = (saved / original_size * 100) if original_size > 0 else 0
        
        return original_size, new_size, saved, percent
    except Exception as e:
        print(f"Error compressing {file_path}: {e}")
        return 0, 0, 0, 0

def main():
    # Start from the current directory
    base_dir = Path(__file__).parent
    
    # Find all PNG files
    png_files = list(base_dir.rglob('*.png'))
    
    print(f"Found {len(png_files)} PNG files to compress...")
    print("=" * 80)
    
    total_original = 0
    total_new = 0
    total_saved = 0
    processed = 0
    
    for png_file in png_files:
        original, new, saved, percent = compress_png(png_file)
        
        if saved > 0:
            total_original += original
            total_new += new
            total_saved += saved
            processed += 1
            
            # Only print if we saved significant space
            if saved > 1024:  # More than 1KB saved
                saved_kb = saved / 1024
                print(f"✓ {png_file.name}: {saved_kb:.1f} KB saved ({percent:.1f}%)")
    
    print("=" * 80)
    print(f"\nCompression Complete!")
    print(f"Files processed: {processed}/{len(png_files)}")
    print(f"Total original size: {total_original / (1024*1024):.2f} MB")
    print(f"Total new size: {total_new / (1024*1024):.2f} MB")
    print(f"Total saved: {total_saved / (1024*1024):.2f} MB ({(total_saved/total_original*100):.1f}%)")

if __name__ == "__main__":
    main()
