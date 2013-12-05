---
layout: index
description: "A collection of work and other tidbits."
---

{% if site.categories.work %}
### Websites
<ul class="posts">
  {% for page in site.categories.work %}
  <li>
  	{% if page.link %}<small class="datetime muted" style=""><a href="http://{{ page.link }}" target="_blank">{{ page.link }}</a></small>{% endif %}
  	<a href="{{ page.url }}">{{ page.title }}</a>
  </li>
  {% endfor %}
</ul>
{% endif %}

{% if site.categories.notes-on %}
### Notes-On
<ul class="posts">
  <li>
  	<a href="{{ post_url 2013-11-19-notes-on }}">Notes-On: Introduction</a>
  </li>
  {% for page in site.categories.notes-on reversed %}
  <li>
  	<a href="{{ page.url }}">{{ page.title }}</a>
  </li>
  {% endfor %}
</ul>
{% endif %}

{% if site.categories.quick-tip %}
### Notes-On
<ul class="posts">
  {% for page in site.categories.quick-tip %}
  <li>
    <a href="{{ page.url }}">{{ page.title }}</a>
  </li>
  {% endfor %}
</ul>
{% endif %}
