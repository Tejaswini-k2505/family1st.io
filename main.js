/**
 * Family1st - Vanilla JavaScript (no frameworks/chunks)
 * Mobile menu toggle only.
 */
(function () {
    function init() {
      var btn = document.getElementById('menu-toggle');
      var menu = document.getElementById('mobile-menu');
      if (btn && menu) {
        btn.addEventListener('click', function () {
          menu.classList.toggle('menu-open');
        });
      }
    }
  
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  })();
  