---
layout: post
title: "Image Gallery for Scribble theme"
categories: blog
---

While creating pages to showcase my work, I found the need for an image gallery. Since I had been away from web development for a long while, I set myself a challenge of creating a simple JavaScript solution (no jQuery!) which suited the Scribble theme.

The resulting gallery JavaScript plugin can be found [here](/javascripts/gallery.js).

There really isn't anything special in the script. But it does excel in it's simplicity.

Since it's primary use is within the Jekyll environment, this means Markdown. To create an image gallery, we simply create an unordered list of images wrapped in a `div`.

<pre><code class="language-html"><div class="gallery" markdown="1">
- ![image description](/path/to/image)
- ![image description](/path/to/image)
- ![image description](/path/to/image)
</div>
</code></pre>

The resulting markup is thus

<pre><code class="language-html"><div class="gallery" data-current="1">
  <ul>
    <li><img src="/path/to/image" alt="image description"></li>
    <li><img src="/path/to/image" alt="image description"></li>
    <li><img src="/path/to/image" alt="image description"></li>
  </ul>
  <div class="gallery-nav-status">
    <span class="gallery-current-image">1</span>/5
  </div>
  <div class="gallery-nav">
    <a class="gallery-nav-left" href="#">&lt;</a>&nbsp;
    <a class="gallery-nav-right" href="#">&gt;</a>
  </div>
  <span class="gallery-title">&nbsp;</span>
</div>
</code></pre>

All navigation and gallery titles are dynamically created and inserted into the DOM. Particular care was taken to use JavaScript techniques which were efficient; performance would then scale well for large image sets.

Multiple galleries can appear on any single page; all navigation elements are created independently to each gallery. Each gallery can also have a title or short description. More options, such as transition effects, will be added in the future.

To enable the gallery, add the following to the YAML front matter for any page or post. This creates galleries with no titles.

<pre><code class="language-yaml">gallery: y
</code></pre>

If a gallery requires a title, use an array of key-value pairs, with `title` as the key.

<pre><code class="language-yaml">gallery:
  - title: "Title for gallery 1"
  - title: "Title for gallery 2"
</code></pre>

If only some galleries on the page have titles, you must also give the rest blank titles. Here, only galleries 1,3, and 4 have titles, whereas galleries 2 and 5 do not.

<pre><code class="language-yaml">gallery:
  - title: "Title for gallery 1"
  - title: ""
  - title: "Title for gallery 3"
  - title: "Title for gallery 4"
  - title: ""
</code></pre>

Most dynamically created elements have a class name attached to them. The styling used for Scribble theme is as follows

<pre><code class="language-css">.gallery {
  font-family: monospace;
  text-align: center;
}

.gallery ul {
  list-style: none;
  padding: 0;
}

.gallery .gallery-nav-status {
  float: left;
}

.gallery .gallery-nav {
  float: right;
}

.gallery .gallery-title {
  display: inline-block;
  width: 70%;
}
</code></pre>

Pretty simple! You can of course spice it up and use images for the navigation buttons, for example.

In addition to changes in `stylessheets/styles.css`, we need to update `_includes/head.html`

<div class="highlight">
<pre><code class="ruby"><span class="n">&#123;% if page.gallery %&#125;</span></code>
<code class="html"><span class="nt">&lt;script </span><span class="na">src=</span><span class="s">&#39;/javascripts/gallery.js&#39;</span> <span class="na">type=</span><span class="s">&#39;text/javascript&#39;</span><span class="nt">&gt;&lt;/script&gt;</span>
</code>
<code><span class="n">&#123;% endif %&#125;</span>
</code></pre>
</div>

and `_includes/footer.html`

<div class="highlight">
<pre><code class="ruby"><span class="n">&#123;% if page.gallery %&#125;</span></code>
<code class="html"><span class="nt">&lt;script </span><span class="na">type=</span><span class="s">&#39;text/javascript&#39;</span><span class="nt">&gt;</span>
  <span class="nx">gallery</span><span class="p">.</span><span class="nx">init</span><span class="p">({</span>
    <span class="nx">title</span><span class="o">:</span> <span class="p">[&#123;</span><span class="o">%</span> <span class="k">for</span> <span class="nx">titles</span> <span class="k">in</span> <span class="nx">page</span><span class="p">.</span><span class="nx">gallery</span> <span class="o">%&#125;</span><span class="s1">&#39;&#123;&#123; titles.title &#125;&#125;&#39;</span><span class="p">,</span><span class="o">&#123;</span><span class="o">%</span> <span class="nx">endfor</span> <span class="o">%&#125;],</span>
  <span class="p">})</span>
<span class="nt">&lt;/script&gt;</span>
</code>
<code><span class="n">&#123;% endif %&#125;</span>
</code></pre>
</div>

Since this was more of a programming exercise, than creating a fully featured image gallery, I have included verbose comments and links to resources which may be of use to others.

If you have any comments, improvements, or bug reports feel free to comment. I will create a Github repository for this plugin after extensive cross-browser testing. Currently, I have only tested it in Chrome on Mac.
