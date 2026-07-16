(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scenes = [...document.querySelectorAll("[data-scene]")];
  const progressBar = document.querySelector("[data-progress-bar]");
  const nav = document.querySelector("[data-nav]");
  const scrollcue = document.querySelector("[data-scrollcue]");
  const cursor = document.querySelector("[data-cursor]");
  const canvas = document.querySelector("[data-particles]");
  const curtain = document.querySelector("[data-curtain]");
  const curtainBtn = document.querySelector("[data-curtain-open]");
  const siteShell = document.querySelector("[data-site]");
  const milestone = document.querySelector("[data-milestone]");
  const milestoneBtn = document.querySelector("[data-milestone-continue]");
  const confettiCanvas = document.querySelector("[data-confetti]");
  const gate = document.querySelector("[data-gate]");
  const gateForm = document.querySelector("[data-gate-form]");
  const gateInput = document.querySelector("[data-gate-input]");
  const gateFeedback = document.querySelector("[data-gate-feedback]");
  const gateCard = document.querySelector("[data-gate-card]");
  const gateMeter = document.querySelector("[data-gate-meter]");
  const gateMoodFace = document.querySelector("[data-gate-mood]");
  const gateHeart = document.querySelector("[data-gate-heart]");

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const lerp = (a, b, t) => a + (b - a) * t;

  const SECRET = 50;

  const createBackgroundMusic = () => {
    const tracks = [
      new Audio("assets/web/khat.mp3"),
      new Audio("assets/web/sitare.mp3"),
    ];
    let current = 0;
    let started = false;
    let userPaused = false;
    let duckLevel = 0;
    const normalVolume = 0.32;
    const duckVolume = 0.06;
    const listeners = new Set();
    let api = null;

    const notify = () => {
      if (!api) return;
      const state = api.getState();
      listeners.forEach((fn) => {
        try {
          fn(state);
        } catch (_) {
          /* ignore */
        }
      });
    };

    const applyVolume = () => {
      const vol = duckLevel > 0 ? duckVolume : normalVolume;
      tracks.forEach((audio) => {
        audio.volume = vol;
      });
    };

    const playCurrent = () => {
      if (!started || userPaused) return;
      tracks[current].play().catch(() => {});
    };

    tracks.forEach((audio, index) => {
      audio.preload = "metadata";
      audio.volume = normalVolume;
      audio.addEventListener("ended", () => {
        if (!started || userPaused) return;
        current = (index + 1) % tracks.length;
        tracks[current].play().catch(() => {});
        notify();
      });
      audio.addEventListener("play", notify);
      audio.addEventListener("pause", notify);
    });

    api = {
      tracks,
      start() {
        if (started) return;
        started = true;
        userPaused = false;
        playCurrent();
        notify();
      },
      pause() {
        if (!started) return;
        userPaused = true;
        tracks.forEach((audio) => audio.pause());
        notify();
      },
      play() {
        if (!started) {
          api.start();
          return;
        }
        userPaused = false;
        playCurrent();
        notify();
      },
      toggle() {
        if (!started) {
          api.start();
          return;
        }
        if (userPaused || tracks[current].paused) api.play();
        else api.pause();
      },
      duck() {
        duckLevel += 1;
        applyVolume();
      },
      unduck() {
        duckLevel = Math.max(0, duckLevel - 1);
        applyVolume();
        if (duckLevel === 0 && started && !userPaused) playCurrent();
      },
      pauseForForeground() {
        tracks.forEach((audio) => audio.pause());
        notify();
      },
      resumeAfterForeground() {
        if (started && duckLevel === 0 && !userPaused) playCurrent();
        notify();
      },
      getState() {
        const playing = started && !userPaused && !tracks[current].paused;
        return {
          started,
          userPaused,
          playing,
          track: current === 0 ? "Khat" : "Sitare",
        };
      },
      onChange(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
      },
    };

    return api;
  };

  let bgm = null;
  let stopSongMedia = () => {};

  const initGate = () => {
    if (!gate || !gateForm || !gateInput) {
      document.body.classList.remove("is-gate-locked");
      curtain?.classList.remove("is-waiting");
      curtain?.setAttribute("aria-hidden", "false");
      return Promise.resolve(true);
    }

    // Soft skip for reduced motion still requires password, just less animation
    let misses = 0;

    const setMood = (mood, face, message, warmth = 0) => {
      gate.dataset.mood = mood;
      if (gateMoodFace) gateMoodFace.textContent = face;
      if (gateFeedback) gateFeedback.textContent = message;
      if (gateMeter) gateMeter.style.width = `${Math.round(warmth * 100)}%`;
    };

    const unlock = () => {
      gate.classList.add("is-unlocked");
      gate.setAttribute("aria-hidden", "true");
      document.body.classList.remove("is-gate-locked");
      curtain?.classList.remove("is-waiting");
      curtain?.setAttribute("aria-hidden", "false");

      if (reduceMotion) {
        curtain?.classList.add("is-gone");
        document.body.classList.remove("is-curtain-locked");
        siteShell?.classList.add("is-revealed");
        return;
      }

      window.setTimeout(() => curtain?.classList.add("is-ready"), 220);
    };

    setMood("far", "💭", "Listen to the riddle. The answer is already in the story.", 0.08);

    gateForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const raw = String(gateInput.value || "").trim().toLowerCase();
      const numeric = Number(raw.replace(/[^\d.-]/g, ""));
      const isFiftyWord =
        raw === "fifty" ||
        raw === "50" ||
        raw === "50 days" ||
        raw === "fifty days" ||
        raw === "day 50" ||
        raw === "our 50 days";

      gateCard?.classList.remove("is-shake", "is-bounce", "is-sad");
      void gateCard?.offsetWidth;

      if (numeric === SECRET || isFiftyWord) {
        setMood("correct", "🎉", "Yes. Today, it became whole. Come in.", 1);
        gateCard?.classList.add("is-bounce");
        gateHeart && (gateHeart.style.opacity = "1");
        gateInput.disabled = true;
        gateForm.querySelector("button")?.setAttribute("disabled", "true");
        window.setTimeout(unlock, 700);
        return;
      }

      if (!raw) {
        setMood("far", "🤔", "Empty air can’t open this door. Try again.", 0.05);
        gateCard?.classList.add("is-shake");
        return;
      }

      const hasNumber = /\d/.test(raw);
      const distance = hasNumber && Number.isFinite(numeric)
        ? Math.abs(numeric - SECRET)
        : null;

      // Non-numeric guesses: playful sadness without revealing format
      if (distance == null) {
        misses += 1;
        const softMiss = [
          "Almost a feeling… but not the key.",
          "Beautiful guess — still not what was counted.",
          "The door stays shy. Think of what someone kept counting.",
          "Close in heart, far from the lock.",
        ];
        setMood(
          misses > 2 ? "sad" : "colder",
          misses > 2 ? "😢" : "😕",
          softMiss[Math.min(misses - 1, softMiss.length - 1)],
          Math.max(0.06, 0.2 - misses * 0.03)
        );
        gateCard?.classList.add(misses > 2 ? "is-sad" : "is-shake");
        gateInput.select();
        return;
      }

      const warmth = clamp(1 - distance / 50, 0, 0.95);

      if (distance <= 2) {
        setMood(
          "close",
          "🫢",
          "So close the air changed. You’re brushing against it.",
          Math.max(warmth, 0.88)
        );
        gateCard?.classList.add("is-bounce");
      } else if (distance <= 5) {
        setMood(
          "hot",
          "✨",
          "Warm — the answer is nearby, like a day almost complete.",
          Math.max(warmth, 0.72)
        );
        gateCard?.classList.add("is-bounce");
      } else if (distance <= 12) {
        setMood(
          "warm",
          "🌤️",
          "Getting warmer… keep following what was counted every day.",
          warmth
        );
      } else if (distance <= 25) {
        misses += 1;
        setMood(
          "colder",
          "😕",
          "A little far. The story grows quieter when the guess drifts.",
          warmth
        );
        gateCard?.classList.add("is-shake");
      } else {
        misses += 1;
        const sadLines = [
          "That made the page a little blue.",
          "Not this one… even the heart drooped a bit.",
          "Still sealed. Something counted is still waiting.",
          "Far away. Try listening to the riddle again.",
        ];
        setMood(
          "sad",
          "😢",
          sadLines[Math.min(misses - 1, sadLines.length - 1)],
          Math.max(0.04, warmth)
        );
        gateCard?.classList.add("is-sad");
      }

      gateInput.select();
    });
  };

  initGate();

  /* ——— Curtain raiser + cinematic SFX (Web Audio) ——— */
  const createAudio = () => {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    const ctx = new Ctx();

    const playTone = (freq, { type = "sine", at = 0, dur = 0.4, gain = 0.08, attack = 0.04 } = {}) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + at);
      g.gain.setValueAtTime(0.0001, ctx.currentTime + at);
      g.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + at + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(ctx.currentTime + at);
      osc.stop(ctx.currentTime + at + dur + 0.05);
    };

    const playNoiseWhoosh = ({ at = 0, dur = 1.2, gain = 0.12 } = {}) => {
      const length = Math.floor(ctx.sampleRate * dur);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      }

      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(420, ctx.currentTime + at);
      filter.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + at + dur * 0.55);
      filter.Q.value = 0.7;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, ctx.currentTime + at);
      g.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + at + 0.12);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + dur);

      src.connect(filter);
      filter.connect(g);
      g.connect(ctx.destination);
      src.start(ctx.currentTime + at);
      src.stop(ctx.currentTime + at + dur + 0.05);
    };

    const playPop = ({ at = 0, gain = 0.16 } = {}) => {
      // Short explosive pop
      playNoiseWhoosh({ at, dur: 0.22, gain });
      playTone(140, { type: "square", at, dur: 0.12, gain: gain * 0.35, attack: 0.005 });
      playTone(90, { type: "sine", at: at + 0.02, dur: 0.18, gain: gain * 0.4, attack: 0.005 });
    };

    return {
      ctx,
      async unlock() {
        if (ctx.state === "suspended") await ctx.resume();
      },
      playIntroSwell() {
        playTone(110, { type: "sine", at: 0, dur: 1.4, gain: 0.05 });
        playTone(164.8, { type: "triangle", at: 0.05, dur: 1.3, gain: 0.03 });
        playTone(220, { type: "sine", at: 0.15, dur: 1.1, gain: 0.025 });
      },
      playCurtainRaise() {
        playNoiseWhoosh({ at: 0, dur: 1.35, gain: 0.14 });
        playTone(196, { type: "sine", at: 0.05, dur: 0.8, gain: 0.05 });
        playTone(293.7, { type: "triangle", at: 0.25, dur: 0.9, gain: 0.04 });
        playTone(784, { type: "sine", at: 0.55, dur: 0.45, gain: 0.035, attack: 0.01 });
        playTone(987.8, { type: "sine", at: 0.72, dur: 0.5, gain: 0.028, attack: 0.01 });
        playTone(1174.7, { type: "sine", at: 0.9, dur: 0.55, gain: 0.022, attack: 0.01 });
      },
      playMilestoneCelebrate() {
        // Twin party poppers
        playPop({ at: 0, gain: 0.17 });
        playPop({ at: 0.12, gain: 0.14 });
        // Festive chord
        playTone(523.25, { type: "triangle", at: 0.08, dur: 0.7, gain: 0.045 });
        playTone(659.25, { type: "sine", at: 0.12, dur: 0.75, gain: 0.04 });
        playTone(783.99, { type: "triangle", at: 0.16, dur: 0.8, gain: 0.035 });
        // Sparkle rain
        playTone(1046.5, { type: "sine", at: 0.28, dur: 0.35, gain: 0.03, attack: 0.01 });
        playTone(1318.5, { type: "sine", at: 0.4, dur: 0.4, gain: 0.025, attack: 0.01 });
        playTone(1568, { type: "sine", at: 0.52, dur: 0.45, gain: 0.02, attack: 0.01 });
      },
    };
  };

  const launchConfetti = () => {
    if (!confettiCanvas || reduceMotion) return () => {};

    const ctx = confettiCanvas.getContext("2d");
    if (!ctx) return () => {};

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let raf = 0;
    let running = true;

    const colors = ["#c45c6a", "#ffb4bf", "#f0c27a", "#ffffff", "#e8a0aa", "#ffd36b", "#f7e4e7"];

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      confettiCanvas.width = width * dpr;
      confettiCanvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const makePiece = (originX, originY, angleBias) => {
      const speed = 7 + Math.random() * 10;
      const angle = angleBias + (Math.random() - 0.5) * 0.9;
      return {
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (4 + Math.random() * 6),
        w: 5 + Math.random() * 7,
        h: 7 + Math.random() * 10,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.35,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        gravity: 0.14 + Math.random() * 0.08,
        drag: 0.988,
      };
    };

    resize();
    const pieces = [];

    // Party poppers from both bottom corners
    for (let i = 0; i < 70; i += 1) {
      pieces.push(makePiece(width * 0.08, height * 0.88, -Math.PI / 2.6));
      pieces.push(makePiece(width * 0.92, height * 0.88, -Math.PI + Math.PI / 2.6));
    }
    // Extra sky burst
    for (let i = 0; i < 40; i += 1) {
      pieces.push(makePiece(width * 0.5, height * 0.35, -Math.PI / 2 + (Math.random() - 0.5)));
    }

    const draw = () => {
      if (!running) return;
      ctx.clearRect(0, 0, width, height);

      pieces.forEach((p) => {
        p.vx *= p.drag;
        p.vy = p.vy * p.drag + p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life -= 0.0045;

        if (p.life <= 0 || p.y > height + 40) return;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });

      raf = requestAnimationFrame(draw);
    };

    draw();
    window.addEventListener("resize", resize, { passive: true });

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      ctx.clearRect(0, 0, width, height);
    };
  };

  const initCurtain = () => {
    const revealSite = () => {
      document.body.classList.remove("is-curtain-locked");
      siteShell?.classList.add("is-revealed");
      if (milestone) {
        milestone.hidden = true;
        milestone.setAttribute("aria-hidden", "true");
        milestone.classList.remove("is-visible", "is-popping");
      }
    };

    if (!curtain || !curtainBtn) {
      revealSite();
      return;
    }

    if (reduceMotion) {
      curtain.classList.add("is-gone");
      curtain.setAttribute("aria-hidden", "true");
      if (!document.body.classList.contains("is-gate-locked")) {
        revealSite();
      }
      return;
    }

    // Curtain text animation waits until the password gate unlocks
    if (!document.body.classList.contains("is-gate-locked")) {
      window.setTimeout(() => curtain.classList.add("is-ready"), 180);
    }

    const audio = createAudio();
    let opened = false;
    let continued = false;
    let stopConfetti = () => {};

    const warmAudio = async () => {
      if (!audio) return;
      try {
        await audio.unlock();
        audio.playIntroSwell();
      } catch (_) {
        /* ignore */
      }
    };

    const showMilestone = () => {
      if (!milestone) {
        revealSite();
        return;
      }

      milestone.hidden = false;
      milestone.setAttribute("aria-hidden", "false");
      // force reflow before animating in
      void milestone.offsetWidth;
      milestone.classList.add("is-visible", "is-popping");

      try {
        audio?.playMilestoneCelebrate();
      } catch (_) {
        /* ignore */
      }

      stopConfetti = launchConfetti();

      // Second small burst for extra party energy
      window.setTimeout(() => {
        if (continued) return;
        milestone.classList.remove("is-popping");
        void milestone.offsetWidth;
        milestone.classList.add("is-popping");
        try {
          audio?.playMilestoneCelebrate();
        } catch (_) {
          /* ignore */
        }
      }, 1600);
    };

    const continueToStory = () => {
      if (continued) return;
      continued = true;
      milestoneBtn && (milestoneBtn.disabled = true);
      milestone?.classList.add("is-leaving");
      siteShell?.classList.add("is-revealed");
      document.body.classList.remove("is-curtain-locked");

      bgm?.start();
      const bgmPlayer = document.querySelector("[data-bgm-player]");
      if (bgmPlayer) {
        bgmPlayer.classList.add("is-visible");
        bgmPlayer.setAttribute("aria-hidden", "false");
      }

      window.setTimeout(() => {
        stopConfetti();
        if (milestone) {
          milestone.hidden = true;
          milestone.setAttribute("aria-hidden", "true");
          milestone.classList.remove("is-visible", "is-popping", "is-leaving");
        }
      }, 750);
    };

    curtainBtn.addEventListener("pointerenter", () => {
      warmAudio();
    }, { once: true });

    curtainBtn.addEventListener("click", async () => {
      if (opened) return;
      opened = true;
      curtainBtn.disabled = true;

      try {
        if (audio) {
          await audio.unlock();
          audio.playCurtainRaise();
        }
      } catch (_) {
        /* continue without sound */
      }

      curtain.classList.add("is-opening");
      curtain.setAttribute("aria-hidden", "true");

      // After curtains part, celebrate the milestone
      window.setTimeout(() => {
        curtain.classList.add("is-gone");
        showMilestone();
      }, 1150);
    });

    milestoneBtn?.addEventListener("click", continueToStory);
  };

  bgm = createBackgroundMusic();

  initCurtain();

  let targetProgress = 0;
  let smoothProgress = 0;
  let cursorX = window.innerWidth / 2;
  let cursorY = window.innerHeight / 2;
  let glowX = cursorX;
  let glowY = cursorY;

  const sceneProgress = (scene) => {
    const rect = scene.getBoundingClientRect();
    const total = scene.offsetHeight - window.innerHeight;
    if (total <= 0) return 0;
    return clamp(-rect.top / total, 0, 1);
  };

  const ensureDots = (scene, steps) => {
    let dots = scene.querySelector(".scene__dots");
    if (dots) return dots;

    const pin = scene.querySelector(".scene__pin");
    if (!pin) return null;

    dots = document.createElement("div");
    dots.className = "scene__dots";
    dots.setAttribute("aria-hidden", "true");

    for (let i = 0; i < steps; i += 1) {
      const dot = document.createElement("span");
      dot.className = "scene__dot";
      dots.appendChild(dot);
    }

    pin.appendChild(dots);
    return dots;
  };

  const activateStep = (scene, step, { animate = true } = {}) => {
    const beats = [...scene.querySelectorAll(".beat[data-phrase]")];
    const frames = [...scene.querySelectorAll("[data-frame]")];
    const eyebrows = scene.querySelectorAll(".eyebrow");
    const veil = scene.querySelector(".scene__veil");
    const mediaCard = scene.querySelector(".scene__media--card");
    const prev = scene._step;
    const direction = prev == null || step >= prev ? "forward" : "back";
    const steps = Math.max(1, Number(scene.dataset.steps) || 1);

    const dots = ensureDots(scene, steps);
    if (dots) {
      [...dots.children].forEach((dot, i) => {
        dot.classList.toggle("is-active", i === step);
      });
    }

    beats.forEach((el) => {
      const id = Number(el.dataset.phrase);
      const wasActive = el.classList.contains("is-active");

      el.classList.remove("from-forward", "from-back", "to-forward", "to-back", "is-leaving");

      if (id === step) {
        el.classList.add("is-active");
        if (animate && prev != null && prev !== step) {
          el.classList.add(direction === "forward" ? "from-forward" : "from-back");
        }
      } else if (wasActive && animate && prev != null && prev !== step) {
        el.classList.remove("is-active");
        el.classList.add("is-leaving", direction === "forward" ? "to-forward" : "to-back");
        window.setTimeout(() => {
          el.classList.remove("is-leaving", "to-forward", "to-back");
        }, 420);
      } else {
        el.classList.remove("is-active");
      }
    });

    eyebrows.forEach((el) => {
      if (el.dataset.phrase == null) {
        el.classList.add("is-active");
        return;
      }
      el.classList.toggle("is-active", Number(el.dataset.phrase) === step);
    });

    if (frames.length) {
      if (animate && prev != null && prev !== step) {
        stopSongMedia();
      }

      frames.forEach((el) => {
        const id = Number(el.dataset.frame);
        const wasActive = el.classList.contains("is-active");

        if (id === step) {
          el.classList.add("is-active");
          el.classList.remove("is-leaving");
          if (el.matches(".song-tile")) el.setAttribute("aria-hidden", "false");
        } else if (wasActive && animate && prev != null && prev !== step) {
          el.classList.remove("is-active");
          el.classList.add("is-leaving");
          if (el.matches(".song-tile")) el.setAttribute("aria-hidden", "true");
          window.setTimeout(() => el.classList.remove("is-leaving"), 750);
        } else {
          el.classList.remove("is-active", "is-leaving");
          if (el.matches(".song-tile")) el.setAttribute("aria-hidden", "true");
        }
      });
    }

    if (animate && prev != null && prev !== step) {
      if (veil) {
        veil.classList.remove("is-flash");
        void veil.offsetWidth;
        veil.classList.add("is-flash");
      }
      if (mediaCard) {
        mediaCard.classList.remove("is-shine");
        void mediaCard.offsetWidth;
        mediaCard.classList.add("is-shine");
      }
    }

    scene._step = step;
  };

  const updateScenes = () => {
    const doc = document.documentElement;
    const scrolled = doc.scrollTop || document.body.scrollTop;
    const max = Math.max(1, doc.scrollHeight - window.innerHeight);
    targetProgress = scrolled / max;

    if (nav) {
      nav.classList.toggle("is-solid", scrolled > window.innerHeight * 0.75);
    }

    if (scrollcue) {
      scrollcue.classList.toggle("is-hidden", scrolled > 60);
    }

    scenes.forEach((scene) => {
      const steps = Math.max(1, Number(scene.dataset.steps) || 1);
      const p = sceneProgress(scene);
      scene._progress = p;
      scene.style.setProperty("--scene-p", p.toFixed(4));

      const pin = scene.querySelector(".scene__pin");
      if (pin) {
        const visible = p > 0 && p < 1 || (p === 0 && scene.getBoundingClientRect().top < window.innerHeight);
        pin.style.opacity = visible || scene.getBoundingClientRect().bottom > 0 ? "1" : "1";
      }

      const card = scene.querySelector(".scene__media--card");
      if (card) {
        const y = (p - 0.5) * -24;
        const scale = 1 + Math.sin(p * Math.PI) * 0.015;
        card.style.setProperty("--card-y", `${y.toFixed(1)}px`);
        card.style.setProperty("--card-scale", scale.toFixed(4));
      }

      const stepped = Math.min(steps - 1, Math.floor(p * steps));
      if (scene._step !== stepped) {
        activateStep(scene, stepped, { animate: !reduceMotion });
      }
    });
  };

  const tick = () => {
    smoothProgress = lerp(smoothProgress, targetProgress, 0.12);
    if (progressBar) {
      progressBar.style.width = `${(smoothProgress * 100).toFixed(2)}%`;
    }

    if (cursor && !reduceMotion) {
      glowX = lerp(glowX, cursorX, 0.12);
      glowY = lerp(glowY, cursorY, 0.12);
      cursor.style.transform = `translate3d(${glowX}px, ${glowY}px, 0)`;
    }

    requestAnimationFrame(tick);
  };

  // Particles
  const initParticles = () => {
    if (!canvas || reduceMotion) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let particles = [];

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * Math.min(window.devicePixelRatio || 1, 2);
      canvas.height = height * Math.min(window.devicePixelRatio || 1, 2);
      ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
      const count = Math.min(48, Math.floor(width / 28));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.8 + 0.4,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -0.15 - Math.random() * 0.35,
        a: Math.random() * 0.35 + 0.1,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        ctx.beginPath();
        ctx.fillStyle = `rgba(196, 92, 106, ${p.a})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });
    draw();
  };

  const initGalleryMotion = () => {
    const items = [...document.querySelectorAll(".gallery__item")];
    const intro = document.querySelector(".gallery__intro");

    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-in"));
      intro?.classList.add("is-in");
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" }
    );

    items.forEach((el, i) => {
      el.style.transitionDelay = `${Math.min(i * 0.07, 0.4)}s`;
      io.observe(el);
    });
    if (intro) io.observe(intro);
  };

  const animateCount = (el, target) => {
    const duration = 1100;
    const start = performance.now();
    const from = 0;

    const frame = (now) => {
      const t = clamp((now - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = String(Math.round(from + (target - from) * eased));
      if (t < 1) requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);
  };

  const initCounters = () => {
    const blocks = [...document.querySelectorAll("[data-counters]")];
    if (!blocks.length) return;

    const run = (block) => {
      block.querySelectorAll("[data-count]").forEach((el) => {
        if (el.dataset.done) return;
        el.dataset.done = "1";
        animateCount(el, Number(el.dataset.count) || 0);
      });
    };

    if (!("IntersectionObserver" in window) || reduceMotion) {
      blocks.forEach(run);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          run(entry.target);
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.4 }
    );

    blocks.forEach((block) => io.observe(block));
  };

  const initQuizzes = () => {
    const gated = [];

    document.querySelectorAll("[data-quiz]").forEach((quiz) => {
      const reveal = quiz.querySelector("[data-quiz-reveal]");
      const unlock = quiz.querySelector("[data-quiz-unlock]");
      const options = [...quiz.querySelectorAll("[data-quiz-option]")];
      const isGate = quiz.hasAttribute("data-quiz-gate");

      if (isGate) {
        gated.push(quiz);
        quiz.classList.add("is-locked-scroll");
      }

      options.forEach((btn) => {
        btn.addEventListener("click", () => {
          if (quiz.classList.contains("is-solved")) return;

          const correct = btn.dataset.correct === "true";

          if (!correct) {
            btn.classList.remove("is-wrong");
            void btn.offsetWidth;
            btn.classList.add("is-wrong", "is-tried");
            // Keep trying until the right answer
            window.setTimeout(() => btn.classList.remove("is-wrong"), 480);
            return;
          }

          // Correct — celebrate and unlock
          quiz.classList.add("is-solved");
          quiz.classList.remove("is-locked-scroll");
          options.forEach((option) => {
            option.disabled = true;
            if (option.dataset.correct === "true") option.classList.add("is-correct");
          });

          if (reveal) reveal.hidden = false;
          if (unlock) unlock.hidden = false;

          // Soft sparkle via temporary class on quiz
          quiz.classList.add("is-celebrating");
          window.setTimeout(() => quiz.classList.remove("is-celebrating"), 900);
        });
      });
    });

    // Block scrolling past an unsolved gated quiz
    if (!gated.length || reduceMotion) return;

    const gateScroll = () => {
      const active = gated.find((quiz) => !quiz.classList.contains("is-solved"));
      if (!active) return;

      const rect = active.getBoundingClientRect();
      // If the quiz has left the upper half of the screen, pull back a bit
      if (rect.bottom < window.innerHeight * 0.42) {
        const top = window.scrollY + rect.top - window.innerHeight * 0.28;
        window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
        active.classList.add("is-locked-scroll");
      }
    };

    let gateTick = false;
    window.addEventListener(
      "scroll",
      () => {
        if (gateTick) return;
        gateTick = true;
        requestAnimationFrame(() => {
          gateScroll();
          gateTick = false;
        });
      },
      { passive: true }
    );
  };

  const initReveals = () => {
    document.querySelectorAll("[data-reveal]").forEach((card) => {
      card.addEventListener("click", () => {
        card.classList.toggle("is-open");
      });
    });
  };

  const initClips = () => {
    const clips = [...document.querySelectorAll("[data-clip]")];
    if (!clips.length) return;

    const pauseOthers = (current) => {
      clips.forEach((clip) => {
        if (clip === current) return;
        const video = clip.querySelector("video");
        const btn = clip.querySelector("[data-sound]");
        if (!video) return;
        video.muted = true;
        clip.classList.remove("is-unmuted");
        if (btn) btn.textContent = "Tap for sound";
      });
    };

    clips.forEach((clip) => {
      const video = clip.querySelector("video");
      const btn = clip.querySelector("[data-sound]");
      if (!video) return;

      video.addEventListener("play", () => {
        clip.classList.add("is-playing");
        if (!video.muted) bgm?.duck();
      });
      video.addEventListener("pause", () => {
        clip.classList.remove("is-playing");
        if (!video.muted) bgm?.unduck();
      });

      btn?.addEventListener("click", async () => {
        try {
          pauseOthers(clip);
          if (video.muted || video.paused) {
            bgm?.duck();
            video.muted = false;
            await video.play();
            clip.classList.add("is-unmuted", "is-playing");
            btn.textContent = "Sound on";
          } else {
            video.muted = true;
            clip.classList.remove("is-unmuted");
            btn.textContent = "Tap for sound";
            bgm?.unduck();
          }
        } catch (_) {
          /* autoplay restrictions — user can try again */
        }
      });
    });

    if (!("IntersectionObserver" in window)) {
      clips.forEach((clip) => {
        const video = clip.querySelector("video");
        video?.play?.().catch(() => {});
      });
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target.querySelector("video");
          if (!video) return;
          if (entry.isIntersecting) {
            video.play().catch(() => {});
          } else {
            video.pause();
            if (!video.muted) bgm?.unduck();
            video.muted = true;
            entry.target.classList.remove("is-unmuted");
            const btn = entry.target.querySelector("[data-sound]");
            if (btn) btn.textContent = "Tap for sound";
          }
        });
      },
      { threshold: 0.45 }
    );

    clips.forEach((clip) => io.observe(clip));
  };

  const initInterludes = () => {
    const interludes = [...document.querySelectorAll("[data-interlude]")];
    if (!interludes.length) return;

    if (!("IntersectionObserver" in window) || reduceMotion) {
      interludes.forEach((el) => el.classList.add("is-in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.2 }
    );

    interludes.forEach((el) => io.observe(el));
  };

  const initSongPlay = () => {
    let activeMedia = null;

    const stopActive = () => {
      if (!activeMedia) return;
      if (activeMedia.kind === "video") {
        activeMedia.el.pause();
        activeMedia.el.currentTime = 0;
        activeMedia.tile?.classList.remove("is-playing", "is-playing-video");
        activeMedia.btn?.classList.remove("is-playing");
        if (activeMedia.videoEl) activeMedia.videoEl.hidden = true;
      } else {
        activeMedia.el.pause();
        activeMedia.el.currentTime = 0;
        activeMedia.btn?.classList.remove("is-playing");
      }
      activeMedia = null;
      bgm?.resumeAfterForeground();
    };

    const playAudio = async (btn, src) => {
      const audio = new Audio(src);
      audio.preload = "metadata";
      bgm?.pauseForForeground();
      stopActive();
      activeMedia = { kind: "audio", el: audio, btn };
      btn.classList.add("is-playing");
      audio.onended = stopActive;
      await audio.play();
    };

    const playVideo = async (btn, src, tile) => {
      const video = tile.querySelector(".song-tile__video");
      if (!video) return;

      bgm?.pauseForForeground();
      stopActive();

      video.innerHTML = "";
      const source = document.createElement("source");
      source.src = src;
      source.type = src.endsWith(".mov") ? "video/mp4" : "video/mp4";
      video.appendChild(source);
      video.hidden = false;
      video.controls = true;
      video.load();

      activeMedia = { kind: "video", el: video, btn, tile, videoEl: video };

      try {
        await video.play();
        btn.classList.add("is-playing");
        tile.classList.add("is-playing", "is-playing-video");
        video.onended = stopActive;
      } catch (_) {
        try {
          await playAudio(btn, "assets/web/khat.mp3");
        } catch (_) {
          stopActive();
        }
      }
    };

    document.querySelectorAll("[data-song-media]").forEach((btn) => {
      const src = btn.dataset.songMedia;
      const kind = btn.dataset.songKind || "audio";
      if (!src) return;

      btn.addEventListener("click", async () => {
        try {
          if (activeMedia?.btn === btn) {
            stopActive();
            return;
          }

          if (kind === "video") {
            const tile = btn.closest(".song-tile");
            if (tile) await playVideo(btn, src, tile);
          } else {
            await playAudio(btn, src);
          }
        } catch (_) {
          stopActive();
        }
      });
    });

    document.querySelectorAll("[data-song-play]").forEach((btn) => {
      const src = btn.dataset.songPlay;
      if (!src) return;
      btn.addEventListener("click", async () => {
        try {
          if (activeMedia?.btn === btn) {
            stopActive();
            return;
          }
          await playAudio(btn, src);
        } catch (_) {
          stopActive();
        }
      });
    });

    stopSongMedia = stopActive;
  };

  const initDatesTimeline = () => {
    const timeline = document.querySelector("[data-dates-timeline]");
    const detailText = document.querySelector("[data-dates-detail-text]");
    if (!timeline || !detailText) return;

    const copy = [
      "May 31 — sunflowers, lake breeze, and the day we found home.",
      "June 12 — matching bracelets, peanut butter, and the first time she fed me.",
      "June 23 — a secret meet, and her head finding my shoulder.",
      "June 28 — dress shopping, Havana Tap House, and sunflowers again.",
      "July 7 — birthday roses, Sukhna, and certainty deepening in the car.",
      "July 10 — Alpha at Cosmos Mall, a forehead kiss, and Gola Sizzlers.",
    ];

    timeline.querySelectorAll("[data-date]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const index = Number(btn.dataset.date);
        timeline.querySelectorAll(".dates-timeline__item").forEach((item) => {
          item.classList.toggle("is-active", item === btn);
        });

        detailText.classList.add("is-swapping");
        window.setTimeout(() => {
          detailText.textContent = copy[index] || copy[0];
          detailText.classList.remove("is-swapping");
        }, 180);
      });
    });
  };

  const initEnvelope = () => {
    const envelope = document.querySelector("[data-envelope]");
    const openBtn = document.querySelector("[data-envelope-open]");
    const notes = document.querySelector("[data-envelope-notes]");
    if (!envelope || !openBtn || !notes) return;

    openBtn.addEventListener("click", () => {
      if (envelope.classList.contains("is-open")) return;
      envelope.classList.add("is-open");
      openBtn.setAttribute("aria-expanded", "true");
    });
  };

  const initNextMilestone = () => {
    const daysEl = document.querySelector("[data-next-days]");
    if (!daysEl) return;

    const target = new Date("2026-09-05T00:00:00+05:30");
    const now = new Date();
    const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    daysEl.textContent = String(Math.max(0, diff));
  };

  const initFinalChapter = () => {
    const section = document.querySelector("[data-final-chapter]");
    const letter = section?.querySelector("[data-typewriter]");
    const starsCanvas = section?.querySelector("[data-final-stars]");
    if (!section || !letter) return;

    const paragraphs = [...letter.querySelectorAll("p")];
    let revealed = false;

    const revealLetter = () => {
      if (revealed) return;
      revealed = true;
      paragraphs.forEach((p, i) => {
        window.setTimeout(() => p.classList.add("is-visible"), i * 650);
      });
    };

    if (!("IntersectionObserver" in window) || reduceMotion) {
      paragraphs.forEach((p) => p.classList.add("is-visible"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          revealLetter();
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.25 }
    );

    io.observe(section);

    if (!starsCanvas || reduceMotion) return;
    const ctx = starsCanvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    const stars = [];

    const resize = () => {
      w = section.clientWidth;
      h = section.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      starsCanvas.width = w * dpr;
      starsCanvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars.length = 0;
      const count = Math.min(120, Math.floor(w / 10));
      for (let i = 0; i < count; i += 1) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.4 + 0.2,
          a: Math.random() * 0.45 + 0.1,
          tw: Math.random() * Math.PI * 2,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      stars.forEach((star) => {
        star.tw += 0.015;
        const alpha = star.a * (0.5 + 0.5 * Math.sin(star.tw));
        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 220, 210, ${alpha})`;
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      });
      requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize, { passive: true });
  };

  const initStoryEnd = () => {
    const section = document.querySelector("[data-story-end]");
    const line = document.querySelector("[data-story-end-line]");
    const infinity = document.querySelector("[data-story-end-infinity]");
    const names = document.querySelector("[data-story-end-names]");
    const dates = document.querySelector("[data-story-end-dates]");
    const again = document.querySelector("[data-endless-again]");
    if (!section) return;

    again?.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });

    const revealEnding = () => {
      if (section.dataset.revealed) return;
      section.dataset.revealed = "1";

      if (line) line.hidden = false;
      window.setTimeout(() => {
        if (infinity) {
          infinity.hidden = false;
          infinity.classList.add("is-visible");
        }
        if (names) names.hidden = false;
        if (dates) dates.hidden = false;
        if (again) again.hidden = false;
      }, 1400);
    };

    if (!("IntersectionObserver" in window) || reduceMotion) {
      revealEnding();
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          revealEnding();
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.4 }
    );

    io.observe(section);
  };

  const initGalleryAudio = () => {
    document.querySelectorAll(".gallery__item video").forEach((video) => {
      video.addEventListener("play", () => {
        if (!video.muted) bgm?.duck();
      });
      video.addEventListener("pause", () => bgm?.unduck());
      video.addEventListener("volumechange", () => {
        if (video.muted || video.paused) bgm?.unduck();
        else bgm?.duck();
      });
    });
  };

  const initBgmPlayer = () => {
    const player = document.querySelector("[data-bgm-player]");
    const toggle = document.querySelector("[data-bgm-toggle]");
    const label = document.querySelector("[data-bgm-label]");
    if (!player || !toggle || !bgm) return;

    const sync = (state) => {
      player.classList.toggle("is-playing", Boolean(state.playing));
      player.classList.toggle("is-paused", Boolean(state.started && !state.playing));
      toggle.setAttribute("aria-pressed", state.playing ? "true" : "false");
      toggle.setAttribute(
        "aria-label",
        state.playing ? "Pause background music" : "Play background music"
      );
      if (label) {
        label.textContent = state.started
          ? state.playing
            ? state.track
            : "Paused"
          : "Music";
      }
    };

    sync(bgm.getState());
    bgm.onChange(sync);

    toggle.addEventListener("click", () => {
      bgm.toggle();
    });
  };

  const initMemoryLoader = () => {
    const section = document.querySelector("[data-memory-loader]");
    if (!section) return;

    const dayEl = section.querySelector("[data-loader-day]");
    const phraseEl = section.querySelector("[data-loader-phrase]");
    const barEl = section.querySelector("[data-loader-bar]");
    const ringEl = section.querySelector("[data-loader-ring]");
    const circumference = 2 * Math.PI * 52;

    const phrases = [
      "Opening the first page…",
      "Saving the first message…",
      "Replaying a 62-minute call…",
      "Packing sunflowers for Chandigarh…",
      "Remembering Sukhna Lake…",
      "Locking in Villagio evenings…",
      "Filing Highway Hut soft moments…",
      "Cueing Khat & Sitare…",
      "Keeping every handwritten note…",
      "Framing mehndi & roka light…",
      "Holding Day 50 close…",
      "Memories ready.",
    ];

    let lastDay = -1;
    let lastPhrase = -1;

    if (ringEl) {
      ringEl.style.strokeDasharray = String(circumference);
      ringEl.style.strokeDashoffset = String(circumference);
    }

    const update = () => {
      const rect = section.getBoundingClientRect();
      const total = section.offsetHeight - window.innerHeight;
      const p = total > 0 ? clamp(-rect.top / total, 0, 1) : 1;
      const day = Math.min(50, Math.round(p * 50));

      if (dayEl && day !== lastDay) {
        dayEl.textContent = String(day);
        lastDay = day;
      }

      if (barEl) barEl.style.width = `${(p * 100).toFixed(1)}%`;
      if (ringEl) {
        ringEl.style.strokeDashoffset = String(circumference * (1 - p));
      }

      const phraseIndex = Math.min(
        phrases.length - 1,
        Math.floor(p * (phrases.length - 0.001))
      );

      if (phraseEl && phraseIndex !== lastPhrase) {
        lastPhrase = phraseIndex;
        phraseEl.classList.add("is-swap");
        window.setTimeout(() => {
          phraseEl.textContent = phrases[phraseIndex];
          phraseEl.classList.remove("is-swap");
        }, 160);
      }

      section.classList.toggle("is-complete", p > 0.96);
    };

    if (reduceMotion) {
      if (dayEl) dayEl.textContent = "50";
      if (barEl) barEl.style.width = "100%";
      if (ringEl) ringEl.style.strokeDashoffset = "0";
      if (phraseEl) phraseEl.textContent = "Memories ready.";
      section.classList.add("is-complete");
      return;
    }

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    update();
  };

  const initEngage = () => {
    initInterludes();
    initMemoryLoader();
    initCounters();
    initQuizzes();
    initReveals();
    initClips();
    initSongPlay();
    initDatesTimeline();
    initEnvelope();
    initNextMilestone();
    initFinalChapter();
    initStoryEnd();
    initGalleryAudio();
    initBgmPlayer();
  };

  scenes.forEach((scene) => {
    scene._step = null;
    activateStep(scene, 0, { animate: false });
  });

  if (reduceMotion) {
    scenes.forEach((scene) => {
      scene.querySelectorAll(".beat, .eyebrow").forEach((el) => el.classList.add("is-active"));
      scene.querySelectorAll("[data-frame]").forEach((el, i) => {
        el.classList.toggle("is-active", i === 0);
      });
    });
    document.querySelectorAll(".gallery__item, .gallery__intro, [data-interlude]").forEach((el) => {
      el.classList.add("is-in");
    });
    initEngage();
    updateScenes();
    if (progressBar) progressBar.style.width = "0%";
    return;
  }

  window.addEventListener(
    "scroll",
    () => {
      updateScenes();
    },
    { passive: true }
  );
  window.addEventListener("resize", updateScenes, { passive: true });

  if (cursor && window.matchMedia("(pointer: fine)").matches) {
    cursor.classList.add("is-on");
    window.addEventListener(
      "pointermove",
      (e) => {
        cursorX = e.clientX;
        cursorY = e.clientY;
      },
      { passive: true }
    );
  }

  initParticles();
  initGalleryMotion();
  initEngage();
  updateScenes();
  tick();

  const rail = document.querySelector("[data-rail]");
  if (rail && window.matchMedia("(pointer: fine)").matches) {
    rail.addEventListener(
      "wheel",
      (e) => {
        if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
        e.preventDefault();
        rail.scrollBy({ left: e.deltaY, behavior: "auto" });
      },
      { passive: false }
    );
  }
})();
