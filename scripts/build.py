import os
import markdown
from jinja2 import Environment, FileSystemLoader
import yaml

CONTENT_DIR = "app/_posts"
TEMPLATE_DIR = "app/_layouts"
OUTPUT_DIR = "build"

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))


def render_template(template_name, context):
    template = env.get_template(template_name)
    return template.render(context)


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

    html_content = markdown.markdown(markdown_content)
    return metadata, html_content


def build_site():
    for filename in os.listdir(CONTENT_DIR):
        if filename.endswith(".md"):
            markdown_path = os.path.join(CONTENT_DIR, filename)
            metadata, html_content = parse_markdown_with_metadata(markdown_path)
            context = metadata
            context["content"] = html_content

            template_name = f"{metadata.get('template', 'default')}.html"

            html_output = render_template(template_name, context)

            output_filename = filename.replace(".md", ".html")
            output_path = os.path.join(OUTPUT_DIR, output_filename)
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(html_output)


if __name__ == "__main__":
    build_site()
