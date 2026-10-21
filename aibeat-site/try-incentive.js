// Try page: community-incentive card with a hover poster.
// 1. Place the card and the reference-only note at the very top of the page,
//    above the "从这里开始" / "Start here" eyebrow in the page header. Without JS
//    they stay as the first blocks of the content, just under the title.
// 2. Lift the poster popover onto <body>: Mintlify's content column sets
//    `container-type: inline-size`, which traps `position: fixed`, so an
//    in-column popover can't centre on the viewport.
// 3. Report `aibeat:poster-view` once per page view: the popover stayed open
//    for 0.6s (hover / keyboard), or, on touch screens where the poster shows
//    inline, the poster was mostly on screen for a second.
(() => {
  // The card and the "examples are for reference" note travel together.
  function placeAboveHeader(block) {
    const header = document.getElementById('header');
    if (!header || block.closest('#header') || block.nextElementSibling === header) return;
    header.parentElement.insertBefore(block, header);
  }

  function bind(trigger) {
    if (trigger.dataset.posterBound) return;
    const pop = trigger.querySelector('.aibeat-try-incentive-pop');
    if (!pop) return;
    trigger.dataset.posterBound = '1';
    pop.classList.add('aibeat-try-incentive-pop--portal');
    document.body.appendChild(pop);

    let dwell;
    const viewed = (method) => {
      if (trigger.dataset.posterViewed) return;
      trigger.dataset.posterViewed = '1';
      document.dispatchEvent(new CustomEvent('aibeat:poster-view', { detail: { method } }));
    };
    const show = (method) => {
      pop.classList.add('is-open');
      clearTimeout(dwell);
      dwell = setTimeout(() => viewed(method), 600);
    };
    const hide = () => { pop.classList.remove('is-open'); clearTimeout(dwell); };
    trigger.addEventListener('mouseenter', () => show('hover'));
    trigger.addEventListener('mouseleave', hide);
    trigger.addEventListener('focus', () => show('focus'));
    trigger.addEventListener('blur', hide);
    trigger.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });

    // Touch / narrow screens show the poster inline (the CSS hides the hover hint).
    const hint = trigger.querySelector('.aibeat-try-incentive-hint');
    const isInline = () => !hint || getComputedStyle(hint).display === 'none';
    if ('IntersectionObserver' in window) {
      let seen;
      const io = new IntersectionObserver(([entry]) => {
        clearTimeout(seen);
        if (entry.isIntersecting && isInline()) seen = setTimeout(() => { if (isInline()) { viewed('inline'); io.disconnect(); } }, 1000);
      }, { threshold: 0.6 });
      io.observe(trigger.querySelector('.aibeat-try-incentive-thumb') || trigger);
    }

    // Client-side navigation removes the trigger; drop the orphaned popover with it.
    new MutationObserver((_, obs) => {
      if (!trigger.isConnected) { pop.remove(); obs.disconnect(); }
    }).observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    const top = document.querySelector('.aibeat-try-top') || document.querySelector('.aibeat-try-incentive');
    if (top) placeAboveHeader(top);
    document.querySelectorAll('.aibeat-try-incentive-poster').forEach(bind);
  }

  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; init(); });
  };
  function start() { init(); new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
