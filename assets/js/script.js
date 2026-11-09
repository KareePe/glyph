/* =========================================================
   GLYPH Living — shared page logic
   ---------------------------------------------------------
   support.js (dc-runtime) evaluates the inline
   <script type="text/x-dc" data-dc-script> of each page and
   expects it to define `Component`. That inline block is now a
   one-line stub:
       const Component = window.GlyphLogic(DCLogic);
   so all real logic lives here.
   ========================================================= */
/* ---------------------------------------------------------
   Preloader
   Covers the page until the dc-runtime has rendered the
   template (#dc-root .site-header) and the window has loaded.
   Minimum display 400ms to avoid a flash; hard cap 5s.
   --------------------------------------------------------- */
(function () {
  var start = Date.now();
  var MIN = 400, MAX = 5000;
  var root = document.documentElement;
  root.classList.add('is-loading');

  var done = false;
  function hide() {
    if (done) return;
    done = true;
    var el = document.getElementById('preloader');
    var wait = Math.max(0, MIN - (Date.now() - start));
    setTimeout(function () {
      root.classList.remove('is-loading');
      if (!el) return;
      el.classList.add('is-done');
      var remove = function () { if (el.parentNode) el.parentNode.removeChild(el); };
      el.addEventListener('transitionend', remove, { once: true });
      setTimeout(remove, 1000); // fallback if no transition (reduced motion)
    }, wait);
  }

  function rendered() { return !!document.querySelector('#dc-root .site-header'); }
  function whenRendered() {
    if (rendered()) return hide();
    if (Date.now() - start > MAX) return hide();
    requestAnimationFrame(whenRendered);
  }

  if (document.readyState === 'complete') whenRendered();
  else window.addEventListener('load', whenRendered);
  setTimeout(hide, MAX); // never block the page
})();

window.GlyphLogic = function (DCLogic, opts) {
  const threshold = (opts && opts.threshold) || 0.06;

  return class Component extends DCLogic {
    state = { menuOpen: false, sent: false, showTop: false };

    componentDidMount() {
      // Scroll-reveal for [data-reveal] elements
      this.io = new IntersectionObserver((es) => {
        es.forEach((e, i) => {
          if (e.isIntersecting || e.boundingClientRect.top < 0) {
            const el = e.target;
            const delay = e.isIntersecting ? Math.min(i * 90, 270) : 0;
            setTimeout(() => el.classList.add('is-in'), delay);
            this.io.unobserve(el);
          }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold });

      this.scan = () => document.querySelectorAll('[data-reveal]:not(.is-in)').forEach(el => {
        if (el.getBoundingClientRect().top < window.innerHeight) { el.classList.add('is-in'); return; }
        this.io.observe(el);
      });
      this.scan();

      // Back-to-top button: show after scrolling down
      this.onScroll = () => {
        const show = window.scrollY > 600;
        if (show !== this.state.showTop) this.setState({ showTop: show });
      };
      window.addEventListener('scroll', this.onScroll, { passive: true });
      this.onScroll();
      this.t = setInterval(this.scan, 600);
    }

    componentWillUnmount() {
      clearInterval(this.t);
      window.removeEventListener('scroll', this.onScroll);
      this.io && this.io.disconnect();
    }

    renderVals() {
      return {
        imgFail: (e) => { e.currentTarget.style.display = 'none'; },
        menuOpen: this.state.menuOpen,
        openMenu: () => { document.body.style.overflow = 'hidden'; this.setState({ menuOpen: true }); },
        closeMenu: () => { document.body.style.overflow = ''; this.setState({ menuOpen: false }); },
        showTop: this.state.showTop,
        toTop: (e) => {
          e.preventDefault();
          const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
        },
        // Contact form (contact.html)
        sent: this.state.sent,
        showForm: !this.state.sent,
        submit: (e) => { e.preventDefault(); this.setState({ sent: true }); }
      };
    }
  };
};
