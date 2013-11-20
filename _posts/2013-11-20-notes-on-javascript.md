---
layout: page
title: "Notes-On: JavaScript"
categories: notes-on
---

### Table of Contents
{:.no_toc}

* Table of Contents
{:toc}

---

## Basics
Javascript is awesome. Variables are loosely-typed. Curly braces (most of the time) and semi-colons are essential. Things just work like you expect them to ... or do they?

### Functions
There are two ways of declaring a function. Both are valid, but try to use the second method as it keeps the usage of `var` to a minimum. Functions can be placed in any order, anywhere in your script file as they are "..." (there is a word for this property ... and I forgot!).

{% highlight javascript %}
// Method One
var function_name = function(arg_one,arg_two) {
    # Do something
};

// Method Two (recommended)
function function_name(arg_one,arg_two) {
    # Do something
}
{% endhighlight %}

Call the function such as `function_name(prop_one,prop_two)`.

### Objects
There are two ways to declare an object in Javascript: through _literal notation_ or via a _constructor_.

{% highlight javascript %}
// Literal Notation
var object_one = {
    prop_one: "value one",
    prop_two: "value two"
};

// Object Constructor
var object_two = new Object();
    object_two.prop_one = "value one";
    object_two.prop_two = "value two";
{% endhighlight %}

To refer to an object property, there are two notations

{% highlight javascript %}
// Dot Notation
var prop1 = object_one.prop_one;

// Bracket Notation
var prop2 = object_one["prop_one"];
{% endhighlight %}

Methods are functions that are associated with a particular object.

### Constructors & Classes
We have already met the `Object` constructor, here are some more alongside their respective literal notation

{% highlight javascript %}
// Object Constructor    // Literal Notation
var obj = new Object();  // var obj = {};

// Array Constructor     // Literal Notation
var arr = new Array();   // var arr = [];

// String Constructor    // Literal Notation
var str = new String();  // var str = "";
{% endhighlight %}

To create your out constructor, use the following

{% highlight javascript %}
function cons_name(arg_one,arg_two) {
    this.prop_one = arg_one;
    this.prop_two = arg_two;
}
{% endhighlight %}

When defining your own constructor, you are in fact defining a new _class_.

### Types
As we have seen there are various types of variables. Use the `typeof` command to return a variable type, such as

{% highlight javascript %}
var anObject = { prop: "value" };
var aNumber  = 1;
var aString  = "string";

console.log( typeof anObject );  // object
console.log( typeof aNumber );   // number
console.log( typeof aString );   // string
{% endhighlight %}

### Object Methods
Objects in Javascript have many methods attached to them natively. Say we have an object called `obj`

{% highlight javascript %}
obj.hasOwnProperty("prop_name");  // Returns true if the object has that particular property
{% endhighlight %}

### Prototypes
A prototype is an object from which other objects inherit properties.

In general, if you want to add a method to a class such that all members of the class can use it, we use the following syntax to _extend the prototype_

{% highlight javascript %}
class.prototype.method_name = function(args) {
    // Do something
}
{% endhighlight %}

Note that we can even extend the prototype of a built-in javascript class.

### Inheritance
You can create new classes which are _children_ of other classes, which effectively become the _parents_.

{% highlight javascript %}
// The child _inherits_ properties and methods from the Parent class
Child.prototype = new Parent();
{% endhighlight %}

Hence, you can create _prototype chains_, whereby children and grandchildren etc can access properties and methods belonging to their parents and grandparents etc.

To test whether a child is an instance of their parent, we can use the `instanceof` keyword.

{% highlight javascript %}
console.log(Child instanceof Parent);
{% endhighlight %}

### Encapsulation
Encapsulation is the grouping of an object's data together with its methods. Encapsulating objects allows us to reuse blocks of code to have a more efficient program.

### Public and Private variables
Up to now, we have been defining _public_ variables in our classes and objects.

{% highlight javascript %}
function Class_Name(arg1,arg2) {
    this.arg1 = arg1;               // Public
    this.arg2 = arg2;               // Public
    var arg3 = "something";         // Private
}
{% endhighlight %}

To access a private variable, we can define a public method, a _getter_.

{% highlight javascript %}
function Class_Name(arg1,arg2) {
    this.arg1 = arg1;               // Public
    this.arg2 = arg2;               // Public
    var arg3 = "something";         // Private
    this.getArg3 = function() {
        return arg3;
    }
}
{% endhighlight %}

Methods can also be private. Just create a public method that returns the private method.

### Loops
There are various loops in Javascript, as in many other programming languages.

{% highlight javascript %}
function Class_Name(arg1,arg2) {
    this.arg1 = arg1;               // Public
    this.arg2 = arg2;               // Public
    var arg3 = "something";         // Private
    this.getArg3 = function() {
        return arg3;
    }
}
{% endhighlight %}

### Arrays
An _indexed array_ is just an ordered list.

{% highlight javascript %}
var array = ["string","another string","yet another string"];
{% endhighlight %}

To access the array, we use literal notation with an index based at zero.

{% highlight javascript %}
console.log(array[0]);  // string
{% endhighlight %}

To add to the end of an array, we use the `push()` method.

{% highlight javascript %}
array.push("one more string");  // ["string","another string","yet another string","one more string"]
{% endhighlight %}

The `splice()` method can be used to remove items from an array. It takes two arguments, both integers, specifying the index to start at, and the number of items to remove.

{% highlight javascript %}
array.splice(1,2);  // ["string","one more string"]
{% endhighlight %}

To copy an array, or part of an array, we use the `slice()` method. If there are no arguments, then the whole array is copied. Else, we state two arguments which specify the start and end indexes required.

{% highlight javascript %}
array.slice();     // ["string","another string","yet another string","one more string"]
array.slice(1,2);  // ["another string","yet another string"]
{% endhighlight %}

Arrays can contain any objects, in any combination, even arrays themselves to make multi-dimentional arrays.

<!-- ## Web Development -->

<!-- ### DOM Scripting -->

## Resources

- [CodeAcademy](http://www.codecademy.com/) courses and [Glossary](http://www.codecademy.com/glossary/javascript)
- [Javascript Weblog](http://javascriptweblog.wordpress.com/2010/06/07/understanding-javascript-prototypes/) on Prototypes
- [Mozilla Developer Network](https://developer.mozilla.org/en-US/docs/JavaScript) Javascript documentation
- [Javascript Scope Quiz](http://madebyknight.com/javascript-scope/)
- [Understanding Javascript OOP](http://killdream.github.com/blog/2011/10/understanding-javascript-oop/)
