---
layout: index
description: "A collection of work."
---

<ul class="posts">
  {% for page in site.categories.work %}
  <li>
  	<!--{% if page.link %}<small class="datetime muted" style="">{{ page.link }}</small>{% endif %}-->
  	<a href="{{ page.url }}">{{ page.title }}</a>
  </li>
  {% endfor %}
</ul>
