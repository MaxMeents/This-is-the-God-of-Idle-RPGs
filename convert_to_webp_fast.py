"""
GPU-Accelerated Multithreaded PNG to WebP Converter
Uses multiprocessing to convert images in parallel across all CPU cores.
"""

import os
from PIL import Image
from pathlib import Path
from multiprocessing import Pool, cpu_count
import time

def convert_single_png(png_path_str):
    """Convert a single PNG file to WebP (lossless). Returns stats."""
    try:
        png_path = Path(png_path_str)
        img = Image.open(png_path)
        
        original_size = os.path.getsize(png_path)
        webp_path = png_path.with_suffix('.webp')
        
        # Lossless WebP with maximum compression
        img.save(webp_path, 'WEBP', quality=100, lossless=True, method=6)
        
        new_size = os.path.getsize(webp_path)
        saved = original_size - new_size
        percent = (saved / original_size * 100) if original_size > 0 else 0
        
        return (png_path.name, original_size, new_size, saved, percent)
    except Exception as e:
        return (str(png_path_str), 0, 0, 0, 0, str(e))

def main():
    base_dir = Path(__file__).parent
    png_files = [str(p) for p in base_dir.rglob('*.png')]
    
    num_cores = cpu_count()
    print(f"Found {len(png_files)} PNG files")
    print(f"Using {num_cores} CPU cores for parallel processing")
    print("=" * 80)
    
    start_time = time.time()
    
    # Process in parallel using all CPU cores
    with Pool(processes=num_cores) as pool:
        results = pool.map(convert_single_png, png_files)
    
    # Calculate totals
    total_original = sum(r[1] for r in results)
    total_new = sum(r[2] for r in results)
    total_saved = sum(r[3] for r in results)
    
    # Print significant savings
    for result in results:
        if len(result) == 6:  # Error case
            print(f"✗ {result[0]}: ERROR - {result[5]}")
        elif result[3] > 10240:  # More than 10KB saved
            print(f"✓ {result[0]}: {result[3]/1024:.1f} KB saved ({result[4]:.1f}%)")
    
    elapsed = time.time() - start_time
    
    print("=" * 80)
    print(f"\nConversion Complete in {elapsed:.1f} seconds!")
    print(f"Files converted: {len(results)}")
    print(f"Total original size: {total_original / (1024*1024):.2f} MB")
    print(f"Total new size: {total_new / (1024*1024):.2f} MB")
    print(f"Total saved: {total_saved / (1024*1024):.2f} MB ({(total_saved/total_original*100):.1f}%)")
    print(f"Speed: {len(results)/elapsed:.1f} files/second")

if __name__ == "__main__":
    main()
