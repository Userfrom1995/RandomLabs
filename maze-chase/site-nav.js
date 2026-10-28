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
  let frame = 0;
  const onResize = () => {
    frame = 0;
    reveal();
  };
  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(onResize);
  };
  window.addEventListener("resize", schedule);
  window.addEventListener("orientationchange", schedule);
})();
