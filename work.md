---
layout: index
---

This page will be updated shortly. Check back soon!

<ul class="posts">
  {% for page in site.pages %}
  {% if page.url contains '/work/' and page.title %}
  <li>
  	<!--{% if page.link %}<small class="datetime muted" style="">{{ page.link }}</small>{% endif %}-->
  	<a href="{{ page.url }}">{{ page.title }}</a>
  </li>
  {% endif %}
  {% endfor %}
</ul>
