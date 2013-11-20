---
layout: index
description: "A collection of work."
---

<ul class="posts">
  {% for page in site.categories.work %}
  <li>
  	{% if page.link %}<small class="datetime muted" style=""><a href="http://{{ page.link }}" target="_blank">{{ page.link }}</a></small>{% endif %}
  	<a href="{{ page.url }}">{{ page.title }}</a>
  </li>
  {% endfor %}
</ul>
