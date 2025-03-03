import os
import shutil
import time
from argparse import ArgumentParser
from datetime import datetime

import markdown
import yaml
from render import render, render_template
from watchdog.events import FileSystemEvent, FileSystemEventHandler
from watchdog.observers import Observer

CONFIG_FILE = "_config.yml"
CONTENT_DIRS = {"blog": "app/_blog", "walks": "app/_walks", "travel": "app/_travel"}
OUTPUT_DIR = "build"
STATIC_ASSETS = ["assets", "css", "img", "js", "CNAME", "index.html"]


def clear_directory(directory):
    for item in os.listdir(directory):
        item_path = os.path.join(directory, item)
        try:
            if os.path.isfile(item_path) or os.path.islink(item_path):
                os.unlink(item_path)
            elif os.path.isdir(item_path):
                shutil.rmtree(item_path)
        except Exception as e:
            print(f"Failed to delete {item_path}. Reason: {e}")


def load_yaml_config(file_path):
    with open(file_path, "r") as f:
        return yaml.safe_load(f.read())


def parse_markdown(markdown_file):
    with open(markdown_file, "r", encoding="utf-8") as f:
        content = f.read()

    parts = content.split("---", 2)
    metadata = yaml.safe_load(parts[1]) if len(parts) == 3 else {}
    markdown_content = parts[2] if len(parts) == 3 else content

    return metadata, markdown.markdown(markdown_content, extensions=["tables"])


def copy_assets(asset_dirs, output_dir):
    for asset_dir in asset_dirs:
        src_dir = os.path.join("app", asset_dir)
        dest_dir = os.path.join(output_dir, asset_dir)

        if os.path.isfile(src_dir):
            shutil.copyfile(src_dir, dest_dir)
        else:
            shutil.copytree(src_dir, dest_dir)


def create_slug(filename):
    slug = ".".join(filename.split(".")[:-1])
    return "-".join(slug.split("-")[3:])


def build_content(site_config, content_dir, output_subdir):
    posts = []

    for filename in sorted(os.listdir(content_dir), reverse=True):
        if filename.endswith(".md"):
            markdown_path = os.path.join(content_dir, filename)
            metadata, html_content = parse_markdown(markdown_path)
            context = {"site": site_config, "page": metadata, "content": html_content}
            template_name = f"{metadata['layout']}.html"
            html_output = render_template(template_name, context)

            slug = create_slug(filename)
            output_path = os.path.join(output_subdir, slug, "index.html")
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(html_output)

            posts.append({"url": slug, "page": metadata})
        else:
            # copy the file over statically
            file_path = os.path.join(content_dir, filename)
            slug = create_slug(filename)
            output_path = os.path.join(output_subdir, slug, filename)
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            shutil.copyfile(file_path, output_path)

    return posts


def build_index(site_config, posts, content_subdir):
    site_config["posts"] = posts
    index_path = os.path.join("app", content_subdir, "index.html")
    metadata, raw_html_content = parse_markdown(index_path)
    html_content = render(raw_html_content, {"site": site_config, "page": metadata})
    context = {"site": site_config, "page": metadata, "content": html_content}
    template_name = f"{metadata['layout']}.html"
    html_output = render_template(template_name, context)

    output_path = os.path.join(OUTPUT_DIR, content_subdir, "index.html")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html_output)


def main():
    clear_directory(OUTPUT_DIR)
    copy_assets(STATIC_ASSETS, OUTPUT_DIR)

    for content_type, content_dir in CONTENT_DIRS.items():
        posts = build_content(
            config, content_dir, os.path.join(OUTPUT_DIR, content_type)
        )
        build_index(config, posts, content_type)


if __name__ == "__main__":
    parser = ArgumentParser()
    parser.add_argument("--watch", action="store_true")

    args = parser.parse_args()

    config = load_yaml_config(CONFIG_FILE)

    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    if args.watch:

        class EventHandler(FileSystemEventHandler):
            def on_any_event(self, event: FileSystemEvent) -> None:
                print(
                    f"[{datetime.now().isoformat()}] Detected change in {os.path.basename(event.src_path)}"
                )
                main()

        event_handler = EventHandler()
        observer = Observer()
        observer.schedule(event_handler, "app", recursive=True)
        observer.start()

        try:
            print("Watching for changes...")
            while True:
                time.sleep(1)
        finally:
            observer.stop()
            observer.join()

    else:
        main()
