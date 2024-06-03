---
layout: post
title: "Solarized Code Highlighting for Scribble theme"
categories: blog
: y
---

Confession: I am addicted to the [Solarized](http://ethanschoonover.com/solarized) colour palette.

Here's how to integrate Solarized into Scribble theme (the currently used Jekyll theme at time of writing).

The following are prerequisites:

- Jekyll is installed, along with all the required gems.
- [Pygments](http://pygments.org) is installed.
- You have a working Jekyll site, using the Scribble theme.
- We are working in the command-line. All paths are relative to the base directory of your blog.

First up, let's back-up the current stylesheet defining the colours for code blocks. Note that the file `syntax.css` is automatically detected and required by Pygments. If you want to use a different filename, define it in `_config.yml`.

<pre><code class="language-bash">mv stylesheets/syntax.css stylesheets/syntax-scribble.css
</code></pre>

Now create a new `syntax.css` file and paste in the CSS styles with respect to the Solarized colour scheme: [Dark](https://gist.github.com/nicolashery/5765395#file-solarized-dark-css) and [Light](https://gist.github.com/nicolashery/5765395#file-solarized-light-css), courtesy of [Nicolas Hery](https://github.com/nicolashery), or use one of the following commands.

<pre><code class="language-bash"># Solarized Dark
curl https://gist.github.com/nicolashery/5765395/raw/91ae32653fec817d26ba322cbe9d62192b07b851/solarized-dark.css -o stylesheets/syntax.css

# Solarized Light
curl https://gist.github.com/nicolashery/5765395/raw/168ea6851298cfd1d5e062ae742e18657b1c7a72/solarized-light.css -o stylesheets/syntax.css
</code></pre>

Next, we need to update the default styles for verbatim text. Within `stylesheets/styles.css`, update the following, choosing the set of styles depending on whether you chose the Dark or Light scheme.

<pre><code class="language-css">code {
  /* Dark */
  background: #002b36;
  color: #93a1a1;
  /* Light */
  background: #fdf6e3;
  color: #586e75;
}
</code></pre>

As a result, code blocks look awesome when displayed with or without line numbers. However, when we choose to use a table to integrate line numbers, we need to do some extra work. Add the following CSS code to the bottom of `styles.css`.

<pre><code class="language-css">.highlighttable {
  width: 100%;
  padding: 0 60px 0 36px !important;
  /* Dark */
  background: #002b36;
  color: #93a1a1;
  /* Light */
  background: #fdf6e3;
  color: #586e75;
}

.highlighttable .linenos {
  width: 24px;
}

.highlighttable pre {
  padding: 10px 0;
  color: #586e75;
  line-height: 1.3em;
}
</code></pre>

That should do it! We now have awesome code blocks, syntax highlighted with the help of Pygments and Solarized.

In case you forgot how to declare a code block, here's a quick recap. There are effectively three basic options when creating a code block.

The first is the default, and displays no line numbers. Replace `<lang>` with a [suitable code language](http://pygments.org/docs/lexers/). This is compulsory, otherwise Jekyll will not successfully build due to an error thrown by Pygments.

<div class="highlight">
  <pre><code class="ruby"><span class="n">&#123;% highlight &lt;lang&gt; %&#125;</span>
  <span class="sr">//</span> <span class="n">code goes here</span>
<span class="n">&#123;% endhighlight %&#125;</span>
</code></pre>
</div>

To display line numbers, add the `linenos` attribute after the language declaration, for example,

<div class="highlight">
  <pre><code class="ruby"><span class="n">&#123;% highlight &lt;lang&gt; linenos %&#125;</span>
  <span class="sr">//</span> <span class="n">code goes here</span>
<span class="n">&#123;% endhighlight %&#125;</span>
</code></pre>
</div>

However, this prevents viewers from easily copying the code by highlighting the text; the line numbers are copied along with the code. To solve this, we specify that the line numbers and code be placed in a table element:

<div class="highlight">
  <pre><code class="ruby"><span class="n">&#123;% highlight &lt;lang&gt; linenos=table %&#125;</span>
  <span class="sr">//</span> <span class="n">code goes here</span>
<span class="n">&#123;% endhighlight %&#125;</span>
</code></pre>
</div>

Our CSS styles above will ensure this last example be displayed correctly.
