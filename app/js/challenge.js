var challenge = {};

(function(ns) {

  // Cache references to DOM
  var target, source, result, button, code = '';

  // Attach event listeners
  function addEvent(obj,type,fn) {
    if(obj.addEventListener) {
      obj.addEventListener(type,fn,false);
    } else if(obj.attachEvent) {
      obj.attachEvent('on' + type, function() { return fn.apply(obj, [window.event]);});
    } else {
      obj['on'+type] = fn;
    }
  }

  // http://stackoverflow.com/questions/454202/creating-a-textarea-with-auto-resize
  function initAutoResize(el) {
    function resize () {
        el.style.height = 'auto';
        el.style.height = el.scrollHeight+'px';
    }

    /* 0-timeout to get the already changed text */
    function delayedResize () {
        window.setTimeout(resize, 0);
    }

    addEvent(el, 'change',  resize);
    addEvent(el, 'cut',     delayedResize);
    addEvent(el, 'paste',   delayedResize);
    addEvent(el, 'drop',    delayedResize);
    addEvent(el, 'keydown', delayedResize);

    resize();
  }

  // Expose init function
  ns.init = function(settings) {
    // Cache references to DOM
    target = document.getElementById(settings.target); // code
    source = document.getElementById(settings.source); // textarea
    result = document.getElementById(settings.result); // code
    button = document.getElementById(settings.button); // input

    initAutoResize(source);

    addEvent(button,'click',function(e) {
      var newcode = source.value;

      if(code !== newcode) {
        code = newcode;
        //eval(code);
      }

      // Run callback if correct
      if( result.innerHTML === target.innerHTML ) settings.success.apply();
      else settings.failure.apply();

      e.returnValue = false;
      if(e.preventValue) e.preventValue();
      return false;
    });
  };

})(this.challenge = this.challenge || {});

// Run plugin
challenge.init({
  target:  'challenge-the-target',
  source:  'challenge-their-code',
  result:  'awesomeness',
  button:  'challenge-check',
  success: function() {
    document.getElementById('challenge-status').innerHTML = 'Output matches!';
    document.getElementById('challenge-the-message').innerHTML = 'Well done on completing the challenge!';
    document.getElementById('challenge-the-prize').style.display = 'block';
  },
  failure: function() {
    document.getElementById('challenge-status').innerHTML = 'Output does not match.';
    document.getElementById('challenge-the-prize').style.display = 'none';
  }
});
