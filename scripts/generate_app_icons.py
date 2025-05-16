import subprocess
import os

# Define the root directory of your project (adjust if this script is moved)
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
ASSETS_DIR = os.path.join(PROJECT_ROOT, 'assets')
SOURCE_SVG = os.path.join(ASSETS_DIR, 'favicon.svg')

# Define the target PNG files and their desired sizes
TARGETS = [
    {
        "filename": "favicon.png",  # For web favicon in app.json
        "width": 64,
        "height": 64
    },
    {
        "filename": "icon.png",      # Main app icon
        "width": 1024,
        "height": 1024
    },
    {
        "filename": "adaptive-icon.png", # Android adaptive icon foreground
        "width": 432,  # Common size, ensure your SVG has transparent background
        "height": 432
    },
    {
        "filename": "splash.png", # For the splash screen
        "width": 1200, # Example size, adjust as needed for your splash design
        "height": 1200 # Ensure your SVG content is centered or designed for this
    }
]

def generate_png(target):
    output_path = os.path.join(ASSETS_DIR, target["filename"])
    width = target["width"]
    height = target["height"]

    print(f"Generating {output_path} ({width}x{height})...")

    # Ensure the source SVG exists
    if not os.path.exists(SOURCE_SVG):
        print(f"Error: Source SVG not found at {SOURCE_SVG}")
        return False

    # Inkscape command
    # Note: For versions < 1.0, use --export-png, --export-width, --export-height
    # For versions >= 1.0, use --export-filename, --export-width, --export-height, --export-type="png"
    # This script assumes Inkscape 1.0+ syntax. Adjust if you have an older version.
    command = [
        "inkscape",
        SOURCE_SVG,
        f"--export-filename={output_path}",
        f"--export-width={str(width)}",
        f"--export-height={str(height)}",
        "--export-type=png"
        # To export the drawing area rather than the page, you can use:
        # "--export-area-drawing"
        # If your SVG page is already perfectly sized and positioned, you might use:
        # "--export-area-page"
        # For favicons, ensuring the background is transparent in the SVG is key.
    ]

    try:
        process = subprocess.run(command, check=True, capture_output=True, text=True)
        if process.returncode == 0:
            print(f"Successfully generated {output_path}")
            return True
        else:
            print(f"Error generating {output_path}:")
            print(f"Stdout: {process.stdout}")
            print(f"Stderr: {process.stderr}")
            return False
    except FileNotFoundError:
        print("Error: Inkscape command not found. Please ensure Inkscape is installed and in your PATH.")
        return False
    except subprocess.CalledProcessError as e:
        print(f"Error during Inkscape execution for {output_path}:")
        print(f"Command: {' '.join(e.cmd)}")
        print(f"Return code: {e.returncode}")
        print(f"Stdout: {e.stdout}")
        print(f"Stderr: {e.stderr}")
        return False
    except Exception as e:
        print(f"An unexpected error occurred while generating {output_path}: {e}")
        return False

if __name__ == "__main__":
    if not os.path.exists(ASSETS_DIR):
        os.makedirs(ASSETS_DIR)
        print(f"Created assets directory: {ASSETS_DIR}")

    all_successful = True
    for target_info in TARGETS:
        if not generate_png(target_info):
            all_successful = False
            print(f"Failed to generate {target_info['filename']}")

    if all_successful:
        print("\nAll PNG assets generated successfully!")
    else:
        print("\nSome PNG assets could not be generated. Please check the errors above.")

    print(f"\nReminder: After generating these assets, you might need to:")
    print(f"1. Update 'app.json' if any filenames/paths for 'icon', 'favicon', or 'splash' need to change (though this script uses standard names).")
    print(f"2. Rebuild your app (expo prebuild, then native builds, or restart web dev server).")
    print(f"3. Clear browser/device caches if old icons persist.") 