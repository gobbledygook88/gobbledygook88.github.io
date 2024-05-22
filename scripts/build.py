import os
import markdown
from jinja2 import Environment, FileSystemLoader

CONTENT_DIR = "content"
TEMPLATE_DIR = "templates"
OUTPUT_DIR = "build"

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))


def render_template(template_name, context):
    template = env.get_template(template_name)
    return template.render(context)


def convert_markdown_to_html(markdown_file):
    with open(markdown_file, "r", encoding="utf-8") as f:
        text = f.read()
    html = markdown.markdown(text)
    return html


def build_site():
    for filename in os.listdir(CONTENT_DIR):
        if filename.endswith(".md"):
            markdown_path = os.path.join(CONTENT_DIR, filename)
            html_content = convert_markdown_to_html(markdown_path)
            context = {"content": html_content}

            template_name = filename.replace(".md", ".html")

            html_output = render_template(template_name, context)

            output_path = os.path.join(OUTPUT_DIR, template_name)
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(html_output)


if __name__ == "__main__":
    build_site()
