import os
import markdown
from jinja2 import Environment, FileSystemLoader

CONTENT_DIR = "content"
TEMPLATE_DIR = "templates"
OUTPUT_DIR = "docs"

# Create output directory if it doesn't exist
if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

# Set up Jinja2 environment
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
    # Loop through markdown files in content directory
    for filename in os.listdir(CONTENT_DIR):
        if filename.endswith(".md"):
            markdown_path = os.path.join(CONTENT_DIR, filename)
            html_content = convert_markdown_to_html(markdown_path)
            context = {"content": html_content}

            # Determine which template to use
            template_name = filename.replace(".md", ".html")

            # Render the template with the content
            html_output = render_template(template_name, context)

            # Write the output to the docs directory
            output_path = os.path.join(OUTPUT_DIR, template_name)
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(html_output)


if __name__ == "__main__":
    build_site()
