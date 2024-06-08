---
layout: blog
title: "LaTeX Syntax Highlighting"
categories: blog
tags: latex quick-tip
---

There are myriad ways of enabling syntax highlighting to a LaTeX document, either for pseudo code, or large chunks of scripts.

My personal favourite syntax highlighting option is via the `listings` package. It provides great features for full customisations alongside a minimal interface.

The full code is given now for those who want to dive straight in. Place all of the following in the header of your LaTeX document. It, of course, uses the [Solarized](http://ethanschoonover.com/solarized) colour scheme.

<pre><code class="language-latex">% Required packages
\usepackage{color}
\usepackage{xcolor}
\usepackage{listings}

% Solarized colour scheme for listings
\definecolor{solarized@base03}{HTML}{002B36}
\definecolor{solarized@base02}{HTML}{073642}
\definecolor{solarized@base01}{HTML}{586e75}
\definecolor{solarized@base00}{HTML}{657b83}
\definecolor{solarized@base0}{HTML}{839496}
\definecolor{solarized@base1}{HTML}{93a1a1}
\definecolor{solarized@base2}{HTML}{EEE8D5}
\definecolor{solarized@base3}{HTML}{FDF6E3}
\definecolor{solarized@yellow}{HTML}{B58900}
\definecolor{solarized@orange}{HTML}{CB4B16}
\definecolor{solarized@red}{HTML}{DC322F}
\definecolor{solarized@magenta}{HTML}{D33682}
\definecolor{solarized@violet}{HTML}{6C71C4}
\definecolor{solarized@blue}{HTML}{268BD2}
\definecolor{solarized@cyan}{HTML}{2AA198}
\definecolor{solarized@green}{HTML}{859900}

% Define C++ syntax highlighting colour scheme
\lstset{language=C++,
        basicstyle=\footnotesize\ttfamily,
        numbers=left,
        numberstyle=\footnotesize,
        tabsize=2,
        breaklines=true,
        escapeinside={@}{@},
        numberstyle=\tiny\color{solarized@base01},
        keywordstyle=\color{solarized@green},
        stringstyle=\color{solarized@cyan}\ttfamily,
        identifierstyle=\color{solarized@blue},
        commentstyle=\color{solarized@base01},
        emphstyle=\color{solarized@red},
        frame=single,
        rulecolor=\color{solarized@base2},
        rulesepcolor=\color{solarized@base2},
        showstringspaces=false
}
</code></pre>

I have included the listings configuration for C++ syntax highlighting, which becomes the default language, and may be changed to suit your own needs.

You can then use the `lstlisting` environment for block code syntax highlighting,

<pre><code class="language-latex">\begin{lstlisting}[caption={Write to stdout},label={lst:stream-out}]
std::cout << "Hello world" << std::endl;
\end{lstlisting}
</code></pre>

or if you want to display another language apart from the default, and with no line numbers

<pre><code class="language-latex">\begin{lstlisting}[language=bash,caption={Echo command},label={lst:bash-echo},numbers=none]
echo "Hello world"
\end{lstlisting}
</code></pre>

It is good practice to provide both the `caption` and `label` attributes, just so you (or others) may refer back to a particular code snippet at a later date.

If you find that you have some extra vertical space around the code snippets, use the following code

<pre><code class="language-latex">\renewcommand{\refname}{\vskip -1cm}
</code></pre>

For full code listings of your program's source files, perhaps placed in your Appendix, it is best to start each on its own page. Additionally, we (should) want to include the external source file, instead of pasting its contents directly into the LaTeX document. This means any changes made to the source file will be automatically included in the LaTeX listings, thus saving a lot of trouble tracking changes.

To do this, we can first define a short macro

<pre><code class="language-latex">\newcommand{\codelst}[1]{\lstinputlisting[caption=\texttt{\protect\detokenize{#1}}]{#1}\newpage}
</code></pre>

We then use it thusly

<pre><code class="language-latex">\codelst{path/to/source/file}
</code></pre>

The macro will insert a page break after the code listing, so that the next listing will begin on a new page. The path to the source file is also used as the caption, and will appear in the list of listings, via the `\lstlistoflistings` command.
