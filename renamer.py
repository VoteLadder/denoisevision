#!/usr/bin/env python3
"""
Image Scanner and Renamer Script

This script scans three folders (noisy, original, denoised), finds images that exist in all three folders,
and renames them to a consistent convention (image_001.jpg, image_002.jpg, etc.)
"""

import os
import shutil
import sys
from pathlib import Path
from datetime import datetime

def scan_and_rename_images():
    # Define the directories to scan
    base_dir = Path(os.path.dirname(os.path.abspath(__file__)))
    
    # Get current date for the JS file
    import_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Ask user for directories or use defaults
    print("Image Scanner and Renamer for DenoiseVision")
    print("===========================================")
    print(f"Current directory: {base_dir}")
    print()
    
    # Get directory paths from user or use defaults
    noisy_dir_path = input(f"Path to noisy images folder [images/noisy]: ").strip()
    noisy_dir = Path(noisy_dir_path) if noisy_dir_path else base_dir / "images" / "noisy"
    
    original_dir_path = input(f"Path to original images folder [images/original]: ").strip()
    original_dir = Path(original_dir_path) if original_dir_path else base_dir / "images" / "original"
    
    denoised_dir_path = input(f"Path to denoised images folder [images/denoised]: ").strip()
    denoised_dir = Path(denoised_dir_path) if denoised_dir_path else base_dir / "images" / "denoised"
    
    # Create output directories if they don't exist
    output_noisy = base_dir / "images" / "noisy"
    output_original = base_dir / "images" / "original"
    output_denoised = base_dir / "images" / "denoised"
    
    for dir_path in [output_noisy, output_original, output_denoised]:
        os.makedirs(dir_path, exist_ok=True)
    
    # Function to get image files from a directory
    def get_image_files(directory):
        if not directory.exists():
            print(f"Warning: Directory {directory} does not exist.")
            return []
        
        image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.tif', '.tiff']
        image_files = []
        
        for file in directory.iterdir():
            if file.is_file() and file.suffix.lower() in image_extensions:
                image_files.append(file.name)
        
        return image_files
    
    # Get image files from each directory
    print("\nScanning directories...")
    noisy_images = get_image_files(noisy_dir)
    original_images = get_image_files(original_dir)
    denoised_images = get_image_files(denoised_dir)
    
    print(f"Found {len(noisy_images)} images in noisy directory")
    print(f"Found {len(original_images)} images in original directory")
    print(f"Found {len(denoised_images)} images in denoised directory")
    
    # Find common images that exist in all three directories
    common_images = set(noisy_images) & set(original_images) & set(denoised_images)
    print(f"\nFound {len(common_images)} images that exist in all three directories")
    
    if not common_images:
        print("Error: No common images found across all three directories.")
        sys.exit(1)
    
    # Ask user if they want to rename and copy the files
    proceed = input("\nDo you want to rename and copy these images to the standard format? (y/n): ").lower()
    if proceed != 'y':
        print("Operation cancelled.")
        sys.exit(0)
    
    # Create a naming convention and copy/rename files
    print("\nRenaming and copying files...")
    common_images = sorted(list(common_images))
    
    for index, image_name in enumerate(common_images):
        # Create new file name with sequential numbering
        extension = Path(image_name).suffix
        new_filename = f"image_{index+1:03d}{extension}"
        
        print(f"Renaming {image_name} to {new_filename}")
        
        # Copy and rename the files to their respective output directories
        try:
            shutil.copy2(noisy_dir / image_name, output_noisy / new_filename)
            shutil.copy2(original_dir / image_name, output_original / new_filename)
            shutil.copy2(denoised_dir / image_name, output_denoised / new_filename)
        except Exception as e:
            print(f"Error copying {image_name}: {e}")
    
    # Generate an image list file for JavaScript
    js_lines = []
    for i, img in enumerate(common_images):
        extension = Path(img).suffix
        js_lines.append(f'    "image_{i+1:03d}{extension}"')
    
    # Construct the JS content without backslashes in f-string expressions
    js_content = (
        f"// Generated image list for DenoiseVision\n"
        f"// Created: {import_date}\n"
        "const AVAILABLE_IMAGES = [\n" +
        ",\n".join(js_lines) +
        "\n];"
    )
    
    with open(base_dir / "image-list.js", "w") as f:
        f.write(js_content)
    
    print(f"\nSuccess! Renamed and copied {len(common_images)} images.")
    print("Images have been copied to:")
    print(f"  - {output_noisy}")
    print(f"  - {output_original}")
    print(f"  - {output_denoised}")
    print("\nAlso created image-list.js with the list of available images.")
    print("\nYou can now use these images with the DenoiseVision application.")

if __name__ == "__main__":
    try:
        scan_and_rename_images()
    except KeyboardInterrupt:
        print("\nOperation cancelled.")
        sys.exit(0)
    except Exception as e:
        print(f"\nAn error occurred: {e}")
        sys.exit(1)
        