"""
Update all .png references to .webp in JavaScript files
"""

import re
from pathlib import Path

def update_js_files():
    """Replace all .png references with .webp in JS files."""
    base_dir = Path(__file__).parent / 'js'
    js_files = list(base_dir.rglob('*.js'))
    
    total_replacements = 0
    files_modified = 0
    
    for js_file in js_files:
        try:
            # Read the file
            content = js_file.read_text(encoding='utf-8')
            original_content = content
            
            # Replace .png with .webp
            content = content.replace('.png', '.webp')
            
            # Count replacements in this file
            replacements = original_content.count('.png')
            
            if replacements > 0:
                # Write back
                js_file.write_text(content, encoding='utf-8')
                total_replacements += replacements
                files_modified += 1
                print(f"✓ {js_file.name}: {replacements} replacements")
        
        except Exception as e:
            print(f"Error processing {js_file}: {e}")
    
    print(f"\nTotal: {total_replacements} replacements in {files_modified} files")

if __name__ == "__main__":
    update_js_files()
