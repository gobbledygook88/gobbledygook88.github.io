---
layout: post
title: "Intel Xeon Phi Coprocessor"
disqus: y
---

Having particular research interests in high performance computing meant that the release of the Intel Xeon Phi Coprocessor, earlier this year, was very big news. It's [1.2 teraflops of performance](http://www.intel.com/content/dam/www/public/us/en/documents/product-briefs/high-performance-xeon-phi-coprocessor-brief.pdf) certainly sounded exciting!

Existing parallel programs, such as those written with MPI, should be able to run without problems (provided you compile the program with the specified Intel compilers and compiler flags). Whether these programs will be able to utilise the Xeon Phi effectively and efficiently is a whole different matter. Only now are we beginning to see research papers and books being released in this area.

Here is a collection of the few I have come across. They certainly make some very interesting reading!

- [Porting to the Intel Xeon Phi: Opportunities and Challenges](https://www.xsede.org/documents/271087/586927/CRosales_TACC_porting_mic.pdf)
- [Best Practice Guide – Intel Xeon Phi](http://www.prace-project.eu/IMG/pdf/Best-Practice-Guide-Intel-Xeon-Phi.pdf)
- [Intel Xeon Phi Coprocessor High-Performance Programming](http://books.google.co.uk/books?id=KJORYTHOxbEC&lpg=PT11&lr=lang_en&pg=PT3#v=onepage&q&f=false)
- [An Empirical Study of Intel Xeon Phi](http://arxiv.org/pdf/1310.5842.pdf)

From what I can gather, these coprocessors work in conjunction with the Intel Xeon E5 processors, which provide excellent performance for efficient parallel programs. I would certainly like to get my hands on one to test out!
