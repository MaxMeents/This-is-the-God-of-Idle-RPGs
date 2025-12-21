"""
PNG to WebP Lossless Conversion Script
Converts all PNG files to WebP format with maximum quality (lossless).
WebP provides 25-35% better compression than PNG while maintaining identical quality.
"""

import os
from PIL import Image
from pathlib import Path

def convert_png_to_webp(png_path):
    """Convert a single PNG file to WebP (lossless)."""
    try:
        # Open the PNG image
        img = Image.open(png_path)
        
        # Get original file size
        original_size = os.path.getsize(png_path)
        
        # Create WebP path (same location, different extension)
        webp_path = png_path.with_suffix('.webp')
        
        # Save as WebP with lossless compression
        # quality=100 + lossless=True ensures no quality loss
        img.save(webp_path, 'WEBP', quality=100, lossless=True, method=6)
        
        # Get new file size
        new_size = os.path.getsize(webp_path)
        
        # Calculate savings
        saved = original_size - new_size
        percent = (saved / original_size * 100) if original_size > 0 else 0
        
        return original_size, new_size, saved, percent, webp_path
    except Exception as e:
        print(f"Error converting {png_path}: {e}")
        return 0, 0, 0, 0, None

def main():
    # Start from the current directory
    base_dir = Path(__file__).parent
    
    # Find all PNG files
    png_files = list(base_dir.rglob('*.png'))
    
    print(f"Found {len(png_files)} PNG files to convert to WebP...")
    print("=" * 80)
    
    total_original = 0
    total_new = 0
    total_saved = 0
    converted = 0
    
    for png_file in png_files:
        original, new, saved, percent, webp_path = convert_png_to_webp(png_file)
        
        if webp_path and saved > 0:
            total_original += original
            total_new += new
            total_saved += saved
            converted += 1
            
            # Print progress for significant files
            if saved > 10240:  # More than 10KB saved
                saved_kb = saved / 1024
                print(f"✓ {png_file.name} → {webp_path.name}: {saved_kb:.1f} KB saved ({percent:.1f}%)")
    
    print("=" * 80)
    print(f"\nConversion Complete!")
    print(f"Files converted: {converted}/{len(png_files)}")
    print(f"Total original size: {total_original / (1024*1024):.2f} MB")
    print(f"Total new size: {total_new / (1024*1024):.2f} MB")
    print(f"Total saved: {total_saved / (1024*1024):.2f} MB ({(total_saved/total_original*100):.1f}%)")
    print(f"\nNext step: Update code to use .webp instead of .png")

if __name__ == "__main__":
    main()
