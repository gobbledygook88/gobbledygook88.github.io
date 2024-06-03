---
layout: blog
title: Simple LRU Cache
categories: blog
---

For a bit of fun, I wanted to implement a simple LRU cache in Python. Here's a short walk-through of my thought processes and general steps.
This LRU cache is not a full implementation for anything you'd want to use in production, but just the core functionality.
I may add more to it in the future though.

If you are looking for a complete LRU cache, consider the following:

* [Python3's `functools.lru_cache`](https://docs.python.org/3/library/functools.html#functools.lru_cache)
* [Python2.6+ compatible LRU cache](https://github.com/jlhutch/pylru)

Others are also available.

## What is an LRU cache?

LRU stands for 'least recently used'. An LRU cache is a cache which discards its least recently used items when it becomes full.

Some examples are with an LRU cache of size 2 applied to a function called `add` which simply adds two numbers together:

<pre><code class="language-python">add(1, 1)  // Returns 2
add(2, 2)  // Returns 4
add(1, 1)  // Returns 2 but from the cache
add(3, 3)  // Returns 6 and discards the cache entry for add(2, 2)
</code></pre>

## Setting up the function decorator

First step is to define how the end-user will interact with the LRU cache.

Typically, this is done via a function decorator. Here's an example:

<pre><code class="language-python">from functools import wraps


def lru_cache(N):

    def wrapper(f):
        cache = LRUCache(f, N)

        @wraps(f)
        def replacement(*args, **kwargs):
            return cache.call(*args, **kwargs)

        return replacement

    return wrapper
</code></pre>

So we expect the LRU cache to be used in the following way:

<pre><code class="language-python">@lru_cache(10)
def add(a, b):
    return a + b
</code></pre>

## First iteration

<pre><code class="language-python">class LRUCache(object):

    def __init__(self, f, N):
        self.f = f
        self.max = N
        self.cache = {}

    def call(self, *args):
        if args in self.cache:
            return self.cache[args]

        value = self.cache[args] = self.f(*args)
        return value
</code></pre>

Here we perform the initial setup of our `LRUCache` class which is consistent with how we intend to use it.
We also stub out an incredibly simple (and incomplete) `call` method; it just returns a cached value if the same arguments are used.

The underlying data structure of this LRU cache is a dictionary.

## Adding the notion of orderedness

To ensure only a maximum of `N` items are cached, we need to add a check after retriving the value.

At the same time, we can switch from using a dictionary to an ordered dictionary. This will allow us to remove the value of the earliest entry.

<pre><code class="language-python">def call(self, *args):
    if args in self.cache:
        value = self.cache[args]
    else:
        value = self.cache[args] = self.f(*args)

    if len(self.cache) > self.max:
        # Pop out the first item that was inserted
        self.cache.popitem(last=False)

    return value
</code></pre>

Note that this is still incorrect - it does not follow the definition of 'least recently used'.

## Removing the correct cached value

<pre><code class="language-python">def call(self, *args):
    value = self.cache.pop(args, self.f(*args))

    # Re-insert into OrderedDict to update order
    self.cache[args] = value

    if len(self.cache) > self.max:
        self.cache.popitem(last=False)

    return value
</code></pre>

Here we `pop` any already cached value or compute a new value given the arguments. This saves us a few lines of code for the earlier `if` statement.

We then re-insert the value so that the `OrderedDict` can update the order internally. This means the `popitem(last=False)` will remove the oldest used cache value, thus keeping only the most recently used items.

## Supporting `kwargs`

The eagle-eyed amoungst us will have spotted that we only supported positional arguments earlier; the kwargs dictionary is not hashable so cannot be used as a dictionary key.

In order to create a key, we convert the dictionary into a list of sorted tuples.

We then use this key when getting and setting values in the cache.

Note this is just an extremely naive way of supporting `kwargs`. It is quite easy to construct test cases which break this.

<pre><code class="language-python">def create_key(self, *args, **kwargs):
    kws = tuple((k, kwargs[k]) for k in sorted(kwargs.keys()))
    return (args, kws)

def call(self, *args, **kwargs):
    key = self.create_key(*args, **kwargs)
    value = self.cache.pop(key, self.f(*args, **kwargs))

    self.cache[key] = value

    # ...
</code></pre>

## Final implementation

Here we present the full implementation of a basic LRU cache.

As previously mentioned, this was just for some fun so its best to use a more fully-featured implementation.

<pre><code class="language-python">from collections import OrderedDict
from functools import wraps


class LRUCache(object):

    def __init__(self, f, N):
        self.f = f
        self.max = N
        self.cache = OrderedDict()

    def create_key(self, *args, **kwargs):
        kws = tuple((k, kwargs[k]) for k in sorted(kwargs.keys()))
        return (args, kws)

    def call(self, *args, **kwargs):
        key = self.create_key(*args, **kwargs)
        value = self.cache.pop(key, self.f(*args, **kwargs))

        # Re-insert into OrderedDict to update order
        self.cache[key] = value

        # Ensure number of items in cache is managed
        if len(self.cache) > self.max:
            # Pop out the first item that was inserted
            self.cache.popitem(last=False)

        return value
</code></pre>
