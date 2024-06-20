from jinja2 import Environment, FileSystemLoader

TEMPLATE_DIR = "app/_layouts"
env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))


def render_template(template_name, context):
    return env.get_template(template_name).render(context)


def render_raw(raw_string, context):
    return env.from_string(raw_string).render(context)
