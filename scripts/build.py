import os
import shutil
import markdown
from jinja2 import Environment, FileSystemLoader
import yaml

CONFIG_FILE = "_config.yml"
CONTENT_DIRS = {"blog": "app/_blog", "walks": "app/_walks"}
TEMPLATE_DIR = "app/_layouts"
OUTPUT_DIR = "build"
STATIC_ASSETS = ["assets", "css", "img", "js", "CNAME", "index.html"]

env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))


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


def render_template(template_name, context):
    return env.get_template(template_name).render(context)


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
    titles = []

    for filename in sorted(os.listdir(content_dir), reverse=True):
        if filename.endswith(".md"):
            markdown_path = os.path.join(content_dir, filename)
            metadata, html_content = parse_markdown(markdown_path)
            context = {"site": site_config, "page": metadata, "content": html_content}
            template_name = f"{metadata.get('layout', 'default')}.html"
            html_output = render_template(template_name, context)

            slug = create_slug(filename)
            output_path = os.path.join(output_subdir, slug, "index.html")
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(html_output)

            titles.append({"url": slug, "title": metadata["title"]})
        else:
            # copy the file over statically
            file_path = os.path.join(content_dir, filename)
            slug = create_slug(filename)
            output_path = os.path.join(output_subdir, slug, filename)
            shutil.copyfile(file_path, output_path)

    return titles


def build_index(site_config, titles, content_subdir):
    site_config["posts"] = titles
    index_path = os.path.join("app", content_subdir, "index.html")
    metadata, raw_html_content = parse_markdown(index_path)
    html_content = env.from_string(raw_html_content).render(
        {"site": site_config, "page": metadata}
    )
    context = {"site": site_config, "page": metadata, "content": html_content}
    template_name = f"{metadata.get('template', 'default')}.html"
    html_output = render_template(template_name, context)

    output_path = os.path.join(OUTPUT_DIR, content_subdir, "index.html")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html_output)


if __name__ == "__main__":
    config = load_yaml_config(CONFIG_FILE)

    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    clear_directory(OUTPUT_DIR)
    copy_assets(STATIC_ASSETS, OUTPUT_DIR)

    for content_type, content_dir in CONTENT_DIRS.items():
        titles = build_content(
            config, content_dir, os.path.join(OUTPUT_DIR, content_type)
        )
        build_index(config, titles, content_type)
