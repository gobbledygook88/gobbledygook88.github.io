#!/usr/bin/env python3
# https://ericmjl.github.io/blog/2023/10/14/how-i-made-a-local-pre-commit-hook-to-resize-images/

from PIL import Image
from pyprojroot import here


def resize_image(image_path, base_width):
    with Image.open(image_path) as img:
        if img.size[0] > base_width:
            w_percent = base_width / float(img.size[0])
            h_size = int(float(img.size[1]) * float(w_percent))
            img = img.resize((base_width, h_size), Image.LANCZOS)
            img.save(image_path)
            return True
    return False


def resize_images_in_tree(root_dir, max_width):
    resized_any = False
    for path in root_dir.rglob("*.jpg"):
        if resize_image(path, max_width):
            print(f"Resized: {path}")
            resized_any = True
    return resized_any


if __name__ == "__main__":
    root_directory = here()
    maximum_width = 700

    if resize_images_in_tree(root_directory, maximum_width):
        print("Some images were resized. Commit rejected.")
        exit(1)
    else:
        print("All images are of the maximum width. Commit accepted.")
        exit(0)
