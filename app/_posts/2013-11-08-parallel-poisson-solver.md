---
layout: post
title: "Parallel Poisson solver"
categories: blog
mathjax: y
---

While organising various projects' code, I thought it was best to extract key components out into separate repositories. You can view them over on my [Github account](https://github.com/gobbledygook88/).

One such repository contains an implementation of a parallel solver for the Poisson equation, namely, for $$\mathbf{r} \in \mathbb{R}^2$$,

$$\nabla \varphi(\mathbf{r}) = \rho(\mathbf{r})$$

on the domain $$[0,1]^2$$

The program is written in C, and uses MPI for message passing to implement the parallel sections. More details can be found in the [readme](https://github.com/gobbledygook88/parallel-poisson/blob/master/README.md) of the [repository](https://github.com/gobbledygook88/parallel-poisson).

The code comments do well to explain most sections of the code, so we will present just the key concepts here.

Essentially, we parallelise the Jacobi scheme -- sharing sections of the domain, evenly, among the available processors. After each iteration, we must perform halo swaps to communicate the newly calculated values.

This is a typical parallelisation strategy which obtains suitable levels of speedup. In order to reduce the runtime further, we look to optimising the main computational section of the algorithm. This involves unrolling myriad loops to minimise redundancies and cache thrashing.

Consequently, the code within the main loop appears overly verbose and repetative. However, the removal of conditional statements within loops results in a significant decrease in the program's runtime.

You can view the code, alongside Mathematica notebooks for plotting the datafiles produced by the program, over on [Github](https://github.com/gobbledygook88/parallel-poisson).
