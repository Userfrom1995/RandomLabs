(() => {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Animated starfield background ---------- */
  const canvas = document.getElementById("bg-canvas");
  const ctx = canvas.getContext("2d");
  let stars = [];
  let mouse = { x: 0, y: 0 };

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const count = Math.min(180, Math.floor((canvas.width * canvas.height) / 9000));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.4 + 0.3,
      a: Math.random() * 0.6 + 0.2,
      dx: (Math.random() - 0.5) * 0.12,
      dy: (Math.random() - 0.5) * 0.12,
    }));
  }

  function drawStars() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const s of stars) {
      s.x += s.dx;
      s.y += s.dy;

      const dxm = s.x - mouse.x;
      const dym = s.y - mouse.y;
      const dist = Math.hypot(dxm, dym);
      if (dist < 160) {
        s.x += (dxm / dist) * 0.18;
        s.y += (dym / dist) * 0.18;
      }

      if (s.x < 0) s.x = canvas.width;
      if (s.x > canvas.width) s.x = 0;
      if (s.y < 0) s.y = canvas.height;
      if (s.y > canvas.height) s.y = 0;

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(165, 180, 252, ${s.a})`;
      ctx.fill();
    }

    if (!prefersReducedMotion) {
      requestAnimationFrame(drawStars);
    }
  }

  resizeCanvas();
  drawStars();
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("mousemove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });

  /* ---------- Scroll reveal ---------- */
  const revealEls = document.querySelectorAll(".card, .project-card, .focus-card, .section-head, .stat-row, .breakdown");
  revealEls.forEach((el) => el.classList.add("reveal"));

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  revealEls.forEach((el) => io.observe(el));

  /* ---------- Parallax glow on cards ---------- */
  document.querySelectorAll(".card, .project-card, .focus-card").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `translateY(-6px) rotateX(${(-y * 4).toFixed(2)}deg) rotateY(${(x * 4).toFixed(2)}deg)`;
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });

  /* ---------- Animate contribution bars when visible ---------- */
  const bars = document.querySelectorAll(".bar-fill");
  const barObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.width = entry.target.getAttribute("style").match(/--w:\s*([^;]+)/)?.[1];
          barObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.4 }
  );
  bars.forEach((bar) => {
    bar.style.width = "0%";
    barObserver.observe(bar);
  });
})();
