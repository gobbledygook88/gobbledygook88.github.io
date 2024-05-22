import os, shutil
import markdown
from jinja2 import Environment, FileSystemLoader
import yaml

CONFIG_FILE = "_config.yml"
CONTENT_DIR = "app/_posts"
TEMPLATE_DIR = "app/_layouts"
OUTPUT_DIR = "build"


env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))


def empty_dir(folder):
    for filename in os.listdir(folder):
        file_path = os.path.join(folder, filename)
        try:
            if os.path.isfile(file_path) or os.path.islink(file_path):
                os.unlink(file_path)
            elif os.path.isdir(file_path):
                shutil.rmtree(file_path)
        except Exception as e:
            print("Failed to delete %s. Reason: %s" % (file_path, e))


def render_template(template_name, context):
    template = env.get_template(template_name)
    return template.render(context)


def load_config():
    with open(CONFIG_FILE, "r") as f:
        config = f.read()

    return yaml.safe_load(config)


def parse_markdown_with_metadata(markdown_file):
    with open(markdown_file, "r", encoding="utf-8") as f:
        content = f.read()

    parts = content.split("---", 2)
    if len(parts) == 3:
        metadata = yaml.safe_load(parts[1])
        markdown_content = parts[2]
    else:
        metadata = {}
        markdown_content = content

    html_content = markdown.markdown(markdown_content, extensions=["tables"])
    return metadata, html_content


def copy_static_assets(dirs):
    for dir in dirs:
        source_asset_dir = os.path.join("app", dir)
        target_asset_dir = os.path.join(OUTPUT_DIR, dir)
        shutil.copytree(source_asset_dir, target_asset_dir)


def build_blog(site_config=None):
    if not site_config:
        site_config = {}

    for filename in os.listdir(CONTENT_DIR):
        if filename.endswith(".md"):
            markdown_path = os.path.join(CONTENT_DIR, filename)
            metadata, html_content = parse_markdown_with_metadata(markdown_path)
            context = {
                "site": site_config,
                "page": metadata,
                "content": html_content,
            }

            template_name = f"{metadata.get('template', 'default')}.html"

            html_output = render_template(template_name, context)

            blog_output_dir = os.path.join(
                OUTPUT_DIR, "blog", filename.removesuffix(".md")
            )
            os.makedirs(blog_output_dir)
            output_path = os.path.join(blog_output_dir, "index.html")
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(html_output)


if __name__ == "__main__":
    config = load_config()

    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    empty_dir(OUTPUT_DIR)
    copy_static_assets(["assets", "css", "img", "js"])
    build_blog(config)
