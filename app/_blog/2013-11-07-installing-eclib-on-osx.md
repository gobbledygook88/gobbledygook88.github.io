---
layout: blog
title: "Installing ECLIB on OS X"
categories: blog
---

### Introduction

ECLIB is a mathematical package for arithmetic on elliptic curves by John Cremona. It has various numerical package prerequisites which must be installed beforehand. These are

- [NTL](http://www.shoup.net/ntl/download.html) (optionally requires GMP)
- [PARI/GP](http://pari.math.u-bordeaux.fr/download.html)
- [FLINT](http://www.flintlib.org/) (which requires MPFR and MPIR)

The links above reference their respective package download pages. The latest versions will be fine.

In addition, you must ensure that the following programs are available and up-to-date.

- wget[^wget]
- Automake
- Autoconf
- Libtool
- GMP
- GNU gcc compilers[^gcc]
- Git

[^wget]:You may use cURL if you prefer it as it is already installed on any Mac.

[^gcc]:As of writing, we are using version 4.7 of the GNU gcc compilers.

Since we are concentrating on OS X, we may install these via [Homebrew](http://brew.sh/).

<pre><code class="language-bash">brew update

brew tap homebrew/dupes
brew install wget autoconf automake gmp git
brew install --universal libtool

brew tap homebrew/versions
brew install --enable-cxx gcc47
</code></pre>

Grab a cup of tea while all the above installs; it will take a while!

Afterwards, do ensure that `brew doctor` is reporting minimal warning messages[^brew-doctor]

[^brew-doctor]:If you have permission warnings after running `brew doctor`, such as

    > Warning: /usr/local/include isn't writable. This can happen if you "sudo make install" software that isn't managed by Homebrew.

    Then run `sudo chown -R $USER /usr/local/include` to take ownership, replacing the directory location for each warning.

    Be sure to link the newly installed packages correctly if Homebrew hasn't already done so, e.g. `brew link autotools`.

### Installing prerequisite packages

Now we can move onto install the prerequisite packages for ECLIB. Let's just be lazy and provide the commands verbatim. They should be pretty self-explanatory.

We will install packages into `/usr/local`, but you may decide to choose a different installation location, e.g. `$HOME/Packages`.

The keen-eyed among us will correctly notice that we do not install MPFR, NTL and PARI/GP (or even MPIR and FLINT via homebrew/-arcane) with Homebrew. This is because Homebrew does not always have the latest version, and we activate some custom command line options which are not exposed via the `brew options` command. Of course, editing the Homebrew formulae will also work.

#### Installing MPFR and MPIR

<pre><code class="language-bash"># Install MPFR
wget http://www.mpfr.org/mpfr-current/mpfr-3.1.2.tar.gz
tar -xvf mpfr-3.1.2.tar.gz
cd mpfr-3.1.2
./configure CC=gcc-4.7 CXX=g++-4.7 --prefix=/usr/local --with-gmp=/usr/local
make
make install

# Install MPIR
wget http://www.mpir.org/mpir-2.6.0.tar.bz2
tar -xvf mpir-2.6.0.tar.bz2
cd mpir-2.6.0
./configure CC=gcc-4.7 CXX=g++-4.7 --prefix=/usr/local --enable-cxx
make
make install
</code></pre>

#### Installing NTL

<pre><code class="language-bash">wget http://www.shoup.net/ntl/ntl-6.0.0.tar.gz
tar -xvf ntl-6.0.0
cd ntl-6.0.0/src
./configure CC=gcc-4.7 CXX=g++-4.7 PREFIX=/usr/local SHARED=on NTL_GMP_LIP=on
</code></pre>

Open the `DoConfig` file with a text editor. Change the `LIBTOOL` variable (around line 22) to use the version install by Homebrew, which adds a 'g' prefix, i.e.

<pre><code class="language-text">'LIBTOOL' => 'glibtool',
</code></pre>

We then proceed to build and install NTL

<pre><code class="language-bash">make
make install
</code></pre>

If you run into errors regarding libtool, open the `makefile` file in a text editor and make the following changes

- In the `ntl.a` rule (around line 372), add `--tag=CXX` after `$(LIBTOOL)`.
- For the definition of the `LCOMP` variable (around line 375), add `--tag=CXX` after `$(LIBTOOL)`.
- In the `.c` rule (around line 394), add `--tag=CXX` after `$(LIBTOOL)`.

Then run `make` and `make install` again.

#### Installing PARI/GP

<pre><code class="language-bash">wget http://pari.math.u-bordeaux.fr/pub/pari/unix/pari-2.5.5.tar.gz
tar -xvf pari-2.5.5
cd pari-2.5.5
./Configure --prefix=/usr/local --with-gmp
make all
make install
</code></pre>

#### Installing FLINT

<pre><code class="language-bash">wget http://www.flintlib.org/flint-2.3.tar.gz
tar -xvf flint-2.3.tar.gz
cd flint-2.3
./configure CC=gcc-4.7 --with-mpir=/usr/local --with-mpfr=/usr/local --with-ntl=/usr/local
</code></pre>

If you get a missing symbol error referencing the NTL library, add the `-lstdc++` flag to the `EXTRA_LIBS` variable within `the Makefile` file. Furthermore, update the `CXX` variable to `g++-4.7` if you are using the GNU compilers.

### Installing ECLIB

Finally, we can install ECLIB.

<pre><code class="language-bash">git clone https://github.com/JohnCremona/eclib.git
cd eclib
./autogen.sh
./configure CC=gcc-4.7 CXX=g++-4.7 --prefix=/usr/local --with-ntl=/usr/local --with-pari=/usr/local --with-flint=/usr/local
make
make check
make install
</code></pre>

With everything working acording to plan, ECLIB should now be installed and any of its programs can be run via the command line[^path].

[^path]:Do ensure your PATH environment variable contains `/usr/local/bin`.

Huzzah!

### Parallel support

As an optional extra, you may install the C++ Boost libraries to gain multi-threaded support in programs which contain parallel sections.

<pre><code class="language-bash">brew install boost
</code></pre>

Note that we must now also specify the location of the Boost libraries during the configure stage of ECLIB

<pre><code class="language-bash">./configure CC=gcc-4.7 CXX=g++-4.7 --prefix=/usr/local --with-ntl=/usr/local --with-pari=/usr/local --with-flint=/usr/local --with-boost=/usr/local
</code></pre>

### Closing remarks

Installing ECLIB in OS X has its quirks, especially when using Apple's clang version of the GCC compilers; installation on a Linux system is certainly more straight-forward. Hopefully, the remarks identified in this post will help you in your journey of installing ECLIB.

If there are any problems, do comment below with any error messages you come across.
