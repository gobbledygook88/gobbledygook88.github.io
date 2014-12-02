---
layout: post
title: "Tables in LaTeX"
categories: blog
disqus: y
---

I came across on [online table editor](http://truben.no/latex/table/) today which looked very useful. It provides a basic interface where you may enter content for your table, and the appropriate code is generated, ready to be copied into your LaTeX document.

It's a great tool to have, and I wish I had found it sooner. The best feature is that the generated LaTeX code is kept aligned, no matter the content. Clean code!

Of course, after entering content, you can always edit the styles, such as column justification or adding more `\hline`s.

For much larger tables (over 100 rows), I still find it easier to adapt a copy of the raw data file into LaTeX code via the command line. Tools such as `awk` and `sed` are brilliant at parsing huge text files at great speed.

Say you had a data file of runtimes (`runtimes.dat`) on an increasing number of threads. The data is arranged in columns. We keep the example short here, but you can apply the same commands to larger datasets.

{% highlight text %}
1 4253.56
2 3582.56
3 2544.45
4 1919.31
5 1577.25
6 1329.78
7 1203.19
8 1063.37
9 976.329
10 959.633
{% endhighlight %}

First, we want to calculate the parallel speedup of the program. We can do this by issuing the following command in a terminal

{% highlight bash %}
awk '{print $1,$2,4253.56/$2}' runtimes.dat > speedup.dat
{% endhighlight %}

We then get the following, found in `speedup.dat`.

{% highlight text %}
1 4253.56 1
2 3582.56 1.1873
3 2544.45 1.6717
4 1919.31 2.21619
5 1577.25 2.69682
6 1329.78 3.19869
7 1203.19 3.53524
8 1063.37 4.00008
9 976.329 4.35669
10 959.633 4.43249
{% endhighlight %}

We can then proceed to convert this data into a LaTeX table. Let's create a backup of the raw data file in case something goes wrong.

{% highlight bash %}
cp speedup.dat speedup-backup.dat
{% endhighlight %}

First we want to add ampersand symbols between each column of data. This is interpreted by LaTeX as the beginning of a new cell in the row.

{% highlight bash %}
sed -e 's/ / \& /' -e 's/\(.*\) /\1 \& /' < speedup.dat > speedup-amps.dat
{% endhighlight %}

We then append double-backslashes to the end of the line.

{% highlight bash %}
sed -e 's/$/ \\\\/g' < speedup-amps.dat > speedup-slash.dat
{% endhighlight %}

Now we have the following

{% highlight text %}
1 & 4253.56 & 1 \\
2 & 3582.56 & 1.1873 \\
3 & 2544.45 & 1.6717 \\
4 & 1919.31 & 2.21619 \\
5 & 1577.25 & 2.69682 \\
6 & 1329.78 & 3.19869 \\
7 & 1203.19 & 3.53524 \\
8 & 1063.37 & 4.00008 \\
9 & 976.329 & 4.35669 \\
10 & 959.633 & 4.43249 \\
{% endhighlight %}

We've done the hard part. Now we format the data into nice columns, and add the opening and closing LaTeX environment tags for creating a table.

{% highlight bash %}
column -t < speedup-slash.dat > speedup-cols.dat
sed -e 's/^/    /g' < speedup-cols.dat > speedup-indent.dat
echo "\\\begin{table}\n  \\\begin{tabular}{lll}" | cat - speedup-indent.dat > speedup-meta.dat
echo "  \\\end{tabular}\n\\\end{table}" >> speedup-meta.dat
{% endhighlight %}

The extra `sed` command simply indents the data columns by four spaces, and is optional.

So there we have it! We have created a valid LaTeX table from the command line (`speedup-meta.dat`).

{% highlight latex %}
\begin{table}
  \begin{tabular}{lll}
    1  & 4253.56 & 1       \\
    2  & 3582.56 & 1.1873  \\
    3  & 2544.45 & 1.6717  \\
    4  & 1919.31 & 2.21619 \\
    5  & 1577.25 & 2.69682 \\
    6  & 1329.78 & 3.19869 \\
    7  & 1203.19 & 3.53524 \\
    8  & 1063.37 & 4.00008 \\
    9  & 976.329 & 4.35669 \\
    10 & 959.633 & 4.43249 \\
  \end{tabular}
\end{table}
{% endhighlight %}

All that's left (provided everystep was successful) is to manually add any table headings, tidy up and remove any temporary files from our directory.

{% highlight bash %}
mv speedup-meta.dat speedup.dat
rm speedup-*
{% endhighlight %}

As an added bonus, you can link in the table into your LaTeX document and not pollute the rest of your document. This is extremely useful if you have a table with many rows.

{% highlight latex %}
\documentclass{article}

\begin{document}

Here is a table of speedups obtained by using a range of threads.

\input{./speedup.dat}

Awesome!

\end{document}
{% endhighlight %}
