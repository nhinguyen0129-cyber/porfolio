/* ==========================================
   TRACES — MARKETER PORTFOLIO
   Main JavaScript
   ========================================== */

(function() {
  'use strict';

  /* ==========================================
     STATE
     ========================================== */
  let currentRoom = 0;
  const totalRooms = 6;
  let isTransitioning = false;
  let soundEnabled = false;
  let audioCtx = null;
  let masterGain = null;

  /* ==========================================
     ELEMENTS
     ========================================== */
  const rooms        = document.querySelectorAll('.room');
  const dots         = document.querySelectorAll('.dot');
  const counterCurrent = document.querySelector('.counter-current');
  const scrollHint   = document.getElementById('scroll-hint');
  const overlay      = document.getElementById('transition-overlay');
  const soundToggle  = document.getElementById('sound-toggle');
  const soundOnIcon  = document.querySelector('.sound-on');
  const soundOffIcon = document.querySelector('.sound-off');
  const enterBtn     = document.getElementById('enter-btn');
  const cursorDot    = document.getElementById('cursor-dot');
  const cursorRing   = document.getElementById('cursor-ring');
  const canvas       = document.getElementById('particle-canvas');
  const ctx2d        = canvas.getContext('2d');

  /* ==========================================
     PROGRESS BAR
     ========================================== */
  const progressLine = document.createElement('div');
  progressLine.className = 'progress-line';
  document.body.appendChild(progressLine);
  updateProgress();

  function updateProgress() {
    const pct = (currentRoom / (totalRooms - 1)) * 100;
    progressLine.style.width = pct + '%';
  }

  /* ==========================================
     CUSTOM CURSOR
     ========================================== */
  let mouseX = 0, mouseY = 0;
  let ringX = 0, ringY = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursorDot.style.left = mouseX + 'px';
    cursorDot.style.top  = mouseY + 'px';
  });

  function animateCursor() {
    ringX += (mouseX - ringX) * 0.12;
    ringY += (mouseY - ringY) * 0.12;
    cursorRing.style.left = ringX + 'px';
    cursorRing.style.top  = ringY + 'px';
    requestAnimationFrame(animateCursor);
  }
  animateCursor();

  /* ==========================================
     PARTICLE SYSTEM
     ========================================== */
  const roomColors = [
    { r: 201, g: 169, b: 110 }, // gold — intro
    { r: 201, g: 169, b: 110 }, // gold — room 1
    { r: 139, g: 111, b: 203 }, // violet — room 2
    { r: 78,  g: 205, b: 196 }, // teal — room 3
    { r: 232, g: 168, b: 124 }, // warm — room 4
    { r: 247, g: 197, b: 159 }, // peach — room 5
  ];

  let particles = [];

  function resizeCanvas() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', () => {
    resizeCanvas();
    const activeRoom = rooms[currentRoom];
    if (activeRoom) {
      const roomCanvas = activeRoom.querySelector('.chart-canvas');
      if (roomCanvas) {
        const canvasId = 'chart-' + currentRoom;
        const labels = (activeRoom.getAttribute('data-chart-labels') || '').split(',');
        const values1 = (activeRoom.getAttribute('data-chart-values') || '').split(',').map(Number);
        const values2Str = activeRoom.getAttribute('data-chart-values2');
        const values2 = values2Str ? values2Str.split(',').map(Number) : null;
        const color = activeRoom.getAttribute('data-color') || '#c9a96e';

        if (labels.length > 0 && values1.length > 0) {
          drawChart(canvasId, labels, values1, values2, color);
        }
      }
    }
  });

  class Particle {
    constructor() { this.reset(true); }

    reset(initial = false) {
      this.x   = Math.random() * canvas.width;
      this.y   = initial ? Math.random() * canvas.height : canvas.height + 10;
      this.size = Math.random() * 1.8 + 0.3;
      this.speedY = -(Math.random() * 0.4 + 0.1);
      this.speedX = (Math.random() - 0.5) * 0.15;
      this.opacity = 0;
      this.maxOpacity = Math.random() * 0.55 + 0.1;
      this.fadeSpeed = Math.random() * 0.005 + 0.002;
      this.life = 'fadein';
    }

    update() {
      this.x += this.speedX;
      this.y += this.speedY;

      if (this.life === 'fadein') {
        this.opacity += this.fadeSpeed;
        if (this.opacity >= this.maxOpacity) { this.opacity = this.maxOpacity; this.life = 'alive'; }
      } else if (this.life === 'alive' && this.y < canvas.height * 0.2) {
        this.life = 'fadeout';
      } else if (this.life === 'fadeout') {
        this.opacity -= this.fadeSpeed;
        if (this.opacity <= 0) { this.reset(); }
      }
    }

    draw() {
      const col = roomColors[currentRoom];
      ctx2d.beginPath();
      ctx2d.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx2d.fillStyle = `rgba(${col.r},${col.g},${col.b},${this.opacity})`;
      ctx2d.fill();
    }
  }

  // Initialize particles
  for (let i = 0; i < 120; i++) {
    particles.push(new Particle());
  }

  function animateParticles() {
    ctx2d.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(animateParticles);
  }
  animateParticles();

  /* ==========================================
     AMBIENT SOUND
     ========================================== */
  function initAudio() {
    if (audioCtx) return;
    audioCtx  = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
    masterGain.connect(audioCtx.destination);

    // Layered drone oscillators
    const freqs = [55, 82.5, 110, 165];
    freqs.forEach((freq, i) => {
      const osc  = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      // Slow detune LFO
      const lfo = audioCtx.createOscillator();
      const lfoGain = audioCtx.createGain();
      lfo.frequency.setValueAtTime(0.08 + i * 0.04, audioCtx.currentTime);
      lfoGain.gain.setValueAtTime(3, audioCtx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.detune);
      lfo.start();

      gain.gain.setValueAtTime(0.06 / (i + 1), audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start();
    });
  }

  function toggleSound() {
    initAudio();
    soundEnabled = !soundEnabled;

    if (soundEnabled) {
      masterGain.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + 1.5);
      soundOnIcon.style.display  = 'inline';
      soundOffIcon.style.display = 'none';
    } else {
      masterGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.0);
      soundOnIcon.style.display  = 'none';
      soundOffIcon.style.display = 'inline';
    }
  }

  soundToggle.addEventListener('click', toggleSound);

  /* ==========================================
     ROOM NAVIGATION
     ========================================== */
  function goToRoom(index) {
    if (index === currentRoom || isTransitioning) return;
    if (index < 0 || index >= totalRooms) return;

    isTransitioning = true;

    // Flash overlay
    overlay.classList.add('flash');

    setTimeout(() => {
      // Deactivate current room
      rooms[currentRoom].classList.remove('active');
      dots[currentRoom].classList.remove('active');

      currentRoom = index;

      // Activate new room
      rooms[currentRoom].classList.add('active');
      dots[currentRoom].classList.add('active');

      // Trigger glitch effects
      const cat = rooms[currentRoom].querySelector('.project-category');
      const title = rooms[currentRoom].querySelector('.project-title');
      if (cat) glitchText(cat);
      if (title) glitchText(title);

      // Trigger chart rendering
      const roomCanvas = rooms[currentRoom].querySelector('.chart-canvas');
      if (roomCanvas) {
        const canvasId = 'chart-' + currentRoom;
        const labels = (rooms[currentRoom].getAttribute('data-chart-labels') || '').split(',');
        const values1 = (rooms[currentRoom].getAttribute('data-chart-values') || '').split(',').map(Number);
        const values2Str = rooms[currentRoom].getAttribute('data-chart-values2');
        const values2 = values2Str ? values2Str.split(',').map(Number) : null;
        const color = rooms[currentRoom].getAttribute('data-color') || '#c9a96e';

        if (labels.length > 0 && values1.length > 0) {
          setTimeout(() => {
            drawChart(canvasId, labels, values1, values2, color);
          }, 150);
        }
      }

      // Update counter
      const num = String(currentRoom + 1).padStart(2, '0');
      counterCurrent.textContent = num;

      // Update progress
      updateProgress();

      // Hide scroll hint after intro
      if (currentRoom > 0) {
        scrollHint.classList.add('hidden');
      } else {
        scrollHint.classList.remove('hidden');
      }

      overlay.classList.remove('flash');

      setTimeout(() => {
        isTransitioning = false;
      }, 500);
    }, 300);
  }

  /* ==========================================
     WHEEL SCROLL
     ========================================== */
  let wheelAccum = 0;
  const WHEEL_THRESHOLD = 120;

  window.addEventListener('wheel', (e) => {
    e.preventDefault();
    wheelAccum += e.deltaY;

    if (Math.abs(wheelAccum) >= WHEEL_THRESHOLD) {
      if (wheelAccum > 0) goToRoom(currentRoom + 1);
      else                 goToRoom(currentRoom - 1);
      wheelAccum = 0;
    }
  }, { passive: false });

  /* ==========================================
     KEYBOARD NAVIGATION
     ========================================== */
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') goToRoom(currentRoom + 1);
    if (e.key === 'ArrowUp'   || e.key === 'ArrowLeft')  goToRoom(currentRoom - 1);
  });

  /* ==========================================
     TOUCH SWIPE
     ========================================== */
  let touchStartY = 0;

  window.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener('touchend', (e) => {
    const delta = touchStartY - e.changedTouches[0].clientY;
    if (Math.abs(delta) > 50) {
      if (delta > 0) goToRoom(currentRoom + 1);
      else           goToRoom(currentRoom - 1);
    }
  }, { passive: true });

  /* ==========================================
     NAV DOTS
     ========================================== */
  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      const target = parseInt(dot.dataset.section);
      goToRoom(target);
    });
  });

  /* ==========================================
     ENTER BUTTON
     ========================================== */
  enterBtn.addEventListener('click', () => {
    goToRoom(1);
  });

  /* ==========================================
     PARALLAX on MOUSEMOVE (bg images)
     ========================================== */
  document.addEventListener('mousemove', (e) => {
    const xPct = (e.clientX / window.innerWidth  - 0.5) * 2;
    const yPct = (e.clientY / window.innerHeight - 0.5) * 2;

    rooms.forEach(room => {
      const bg = room.querySelector('.room-bg-image');
      if (!bg) return;
      const moveX = xPct * 8;
      const moveY = yPct * 8;
      bg.style.transform = `scale(1.08) translate(${moveX}px, ${moveY}px)`;
    });

    const activeRoom = rooms[currentRoom];
    if (activeRoom) {
      const bg = activeRoom.querySelector('.room-bg-image');
      if (bg) {
        bg.style.transform = `scale(1) translate(${xPct * 6}px, ${yPct * 6}px)`;
      }
    }
  });

  /* ==========================================
     GLITCH TEXT EFFECT on project titles
     ========================================== */
  const GLITCH_CHARS = '!<>-_\\/[]{}—=+*^?#@$%';

  function glitchText(el) {
    const original = el.dataset.original || el.textContent;
    el.dataset.original = original;
    let iteration = 0;
    const maxIter = original.length * 2;

    const interval = setInterval(() => {
      el.textContent = original.split('').map((char, i) => {
        if (char === ' ' || char === '\n') return char;
        if (i < iteration / 2) return original[i];
        return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
      }).join('');

      if (iteration >= maxIter) {
        el.textContent = original;
        clearInterval(interval);
      }
      iteration++;
    }, 28);
  }

  /* ==========================================
     CHARTS (CANVAS)
     ========================================== */
  function drawChart(canvasId, labels, values1, values2, accentColor) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    const paddingLeft = 32;
    const paddingRight = 16;
    const paddingTop = 20;
    const paddingBottom = 24;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const maxVal1 = Math.max(...values1, 1);
    const maxVal2 = values2 ? Math.max(...values2, 1) : 0;
    const maxVal = Math.max(maxVal1, maxVal2);

    // Grid lines
    ctx.strokeStyle = 'rgba(240, 237, 232, 0.05)';
    ctx.lineWidth = 1;
    ctx.font = '9px "Space Mono", monospace';
    ctx.fillStyle = 'rgba(240, 237, 232, 0.4)';

    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
      const y = paddingTop + chartHeight - (i / gridLines) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width - paddingRight, y);
      ctx.stroke();

      const valLabel = Math.round((i / gridLines) * maxVal);
      ctx.textAlign = 'right';
      ctx.fillText(valLabel, paddingLeft - 8, y + 3);
    }

    // X axis labels
    const numPoints = labels.length;
    const stepX = chartWidth / (numPoints - 1 || 1);

    labels.forEach((label, i) => {
      const x = paddingLeft + i * stepX;
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(240, 237, 232, 0.03)';
      ctx.moveTo(x, paddingTop);
      ctx.lineTo(x, paddingTop + chartHeight);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillText(label, x, paddingTop + chartHeight + 16);
    });

    // Draw lines
    drawLine(values1, accentColor, maxVal, false);

    if (values2) {
      drawLine(values2, 'rgba(240, 237, 232, 0.65)', maxVal, true);
    }

    function drawLine(vals, color, max, isDash) {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      if (isDash) {
        ctx.setLineDash([4, 4]);
      } else {
        ctx.setLineDash([]);
      }

      vals.forEach((v, i) => {
        const x = paddingLeft + i * stepX;
        const y = paddingTop + chartHeight - (v / max) * chartHeight;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      vals.forEach((v, i) => {
        const x = paddingLeft + i * stepX;
        const y = paddingTop + chartHeight - (v / max) * chartHeight;
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = '#080808';
        ctx.arc(x, y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }

  /* ==========================================
     LIGHTBOX
     ========================================== */
  const lightbox = document.getElementById('lightbox');
  const lightboxInner = document.getElementById('lightbox-inner');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const lightboxClose = document.getElementById('lightbox-close');

  document.querySelectorAll('.gallery-item').forEach(item => {
    item.addEventListener('click', () => {
      const inner = item.querySelector('.gallery-img-inner');
      const caption = item.querySelector('.gallery-caption');
      
      if (inner) {
        lightboxInner.innerHTML = '';
        const clone = inner.cloneNode(true);
        lightboxInner.appendChild(clone);
        lightboxCaption.textContent = caption ? caption.textContent : '';
        lightbox.classList.add('active');
      }
    });
  });

  lightboxClose.addEventListener('click', () => {
    lightbox.classList.remove('active');
  });

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox || e.target === lightboxInner) {
      lightbox.classList.remove('active');
    }
  });

  /* ==========================================
     NOISE GRAIN overlay (CSS canvas)
     ========================================== */
  const grainCanvas = document.createElement('canvas');
  grainCanvas.style.cssText = `
    position:fixed; top:0; left:0; width:100%; height:100%;
    pointer-events:none; z-index:2; opacity:0.032; mix-blend-mode:screen;
  `;
  document.body.appendChild(grainCanvas);
  const grainCtx = grainCanvas.getContext('2d');

  function renderGrain() {
    grainCanvas.width  = window.innerWidth;
    grainCanvas.height = window.innerHeight;
    const imageData = grainCtx.createImageData(grainCanvas.width, grainCanvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const val = Math.random() * 255;
      data[i] = data[i+1] = data[i+2] = val;
      data[i+3] = 255;
    }
    grainCtx.putImageData(imageData, 0, 0);
  }

  // Re-render grain every ~4 frames for subtle film effect
  let grainFrame = 0;
  function grainLoop() {
    grainFrame++;
    if (grainFrame % 4 === 0) renderGrain();
    requestAnimationFrame(grainLoop);
  }
  grainLoop();

  /* ==========================================
     INIT — activate intro room
     ========================================== */
  rooms[0].classList.add('active');
  dots[0].classList.add('active');

  // Stagger the intro animations with a small boot delay
  setTimeout(() => {
    document.querySelectorAll('#room-0 .reveal-up').forEach(el => {
      el.style.transitionDelay = el.style.transitionDelay || '0s';
    });
  }, 100);

  console.log('%cTraces Portfolio', 'color:#c9a96e; font-size:18px; font-family:serif;');
  console.log('%cAn immersive marketer portfolio experience', 'color:#888; font-size:12px;');

})();
