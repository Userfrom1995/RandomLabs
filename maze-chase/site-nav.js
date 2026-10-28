(() => {
  const nav = document.querySelector(".site-nav");
  const active = nav && nav.querySelector('[aria-current="page"]');
  if (!nav || !active) return;
  const reveal = () => {
    const box = nav.getBoundingClientRect();
    const pill = active.getBoundingClientRect();
    if (pill.left >= box.left && pill.right <= box.right) return;
    nav.scrollLeft += pill.left - box.left - (box.width - pill.width) / 2;
  };
  reveal();
  let lastWidth = nav.getBoundingClientRect().width;
  let frame = 0;
  const onWidthChange = () => {
    frame = 0;
    const width = nav.getBoundingClientRect().width;
    if (width === lastWidth) return;
    lastWidth = width;
    reveal();
  };
  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(onWidthChange);
  };
  window.addEventListener("resize", schedule);
  window.addEventListener("orientationchange", schedule);
})();
