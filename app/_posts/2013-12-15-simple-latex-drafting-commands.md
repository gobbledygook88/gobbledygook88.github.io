---
layout: post
title: "Simple LaTeX Drafting Commands"
categories: blog
tags: latex quick-tip
disqus: y
---

When drafting a document, you may find it useful to leave short notes or hints which require further attention later on. Perhaps you do not want to disrupt your flow of inspiration, or an entire paragraph needs re-structuring.

The following command definitions are a quick and dirty way of providing semantic colour-coded drafting tools.

<pre><code class="language-latex">{% raw %}
\newcommand{\draftoutput}[2]{(#1\ifthenelse{\isempty{#2}}{#2}{ - #2})}
\newcommand{\rephrase}[1]{{\color{solarized@orange}\draftoutput{REPHRASE}{#1}}}
\newcommand{\reference}[1]{{\color{solarized@cyan}\draftoutput{REFERENCE}{#1}}}
\newcommand{\aside}[1]{{\color{solarized@green}\draftoutput{ASIDE}{#1}}}
\newcommand{\todo}[1]{{\color{solarized@magenta}\draftoutput{TODO}{#1}}}
{% endraw %}
</code></pre>

This exposes a set of commands which can be used in any text environment:

- `\rephrase` - highlight a block of text to rephrase later on
- `\reference` - instead of using an empty `\cite` tag (which can be easily missed), give yourself a short reminder of which reference is required
- `\aside` - highlight some text which contains extra information, but is not absolutely essential and may be taken out if required
- `\todo` - basic draft command

These commands are used in similar fashion to other inline text commands:

<pre><code class="language-latex">\todo{insert an image of a dragon here}
</code></pre>

NB: The first command (`\draftoutput`) is a helper command to keep the code clean, and may be ignored.

Each drafting command has an associated colour, and as such, we require the `color` package (or the `xcolor` package). You may customise them to suit your needs.

As you may have already guessed, my colour preference is the [Solarized](http://ethanschoonover.com/solarized) colour scheme. The colours are defined over in the post on [LaTeX syntax highlighting]({% post_url 2013-12-10-latex-syntax-highlighting %}).

Of course, you may add or remove any commands to suit your own drafting routines, but try to keep their numbers to a minimum. You want commands which are easy to remember and type; they should not hinder your writing in any way.

An alternative is to use the `pdfcomment` package which provides excellent features in formatting and styling comments, if you need the extra functionality that is.