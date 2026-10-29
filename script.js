(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);

  const $$ = (selector, root = document) => [
    ...root.querySelectorAll(selector),
  ];

  // Éléments principaux
  const opening = $("#opening");
  const envelope = $("#envelope");
  const seal = $("#envelopeSeal");
  const hint = $("#openingHint");

  const intro = $("#introScreen");
  const continueButton = $("#continueToScrapbook");

  const scrapbook = $("#scrapbookScene");
  const chapters = $$(".chapter");
  const dots = $$(".progress-dot");

  const previous = $("#previousPage");
  const next = $("#nextPage");
  const currentChapter = $("#currentChapter");
  const pageTurnHint = $("#pageTurnHint");
  const restartButton = $("#restartButton");

  const music = $("#backgroundMusic");
  const musicToggle = $("#musicToggle");
  const musicState = $("#musicState");

  const confettiLayer = $("#confettiLayer");

  const videos = $$(".scrapbook-video");

  // Vérification des éléments indispensables
  if (!opening || !scrapbook || chapters.length === 0) {
    console.error(
      "Scrapbook : élément HTML manquant. Vérifie #opening, #scrapbookScene et .chapter.",
    );
    return;
  }

  let activeIndex = 0;
  let introOpened = false;
  let musicAutoStarted = false;
  let hintTimer;
  let revealTimers = [];
  let confettiTimer;

  if (music) {
    music.volume = 0.45;
  }

  /* SCROLL : toujours revenir en haut de la page */

  function scrollToTop() {
    const options = { top: 0, left: 0, behavior: "instant" };

    scrapbook.scrollTo(options);
    window.scrollTo(options);

    if (document.scrollingElement) {
      document.scrollingElement.scrollTo(options);
    }
  }

  /* ANIMATION DES TEXTES */

  function clearRevealTimers() {
    revealTimers.forEach((timer) => clearTimeout(timer));
    revealTimers = [];
  }

  function revealChapter(index) {
    clearRevealTimers();

    const chapter = chapters[index];

    if (!chapter) return;

    const items = $$(".reveal-text", chapter);

    // Masquer tous les textes avant de relancer l'animation.
    items.forEach((item) => {
      item.classList.remove("is-visible");
    });

    // Laisser le navigateur appliquer l'état initial.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        items.forEach((item, itemIndex) => {
          const timer = setTimeout(
            () => {
              item.classList.add("is-visible");
            },
            180 + itemIndex * 260,
          );

          revealTimers.push(timer);
        });
      });
    });
  }

  /* PETITS MESSAGES */

  function showHint(message) {
    if (!pageTurnHint) return;

    pageTurnHint.textContent = message;
    pageTurnHint.classList.add("show");

    clearTimeout(hintTimer);

    hintTimer = setTimeout(() => {
      pageTurnHint.classList.remove("show");
    }, 2400);
  }

  /* MUSIQUE */

  function updateMusicUI() {
    const playing = Boolean(music) && !music.paused;

    if (musicToggle) {
      musicToggle.classList.toggle("playing", playing);
      musicToggle.setAttribute(
        "aria-label",
        playing ? "Pause music" : "Play music",
      );
    }

    // Le texte indique l'action du bouton
    if (musicState) {
      musicState.textContent = playing ? "sound off" : "sound on";
    }
  }

  // auto = lancement automatique (une seule fois), sinon lancement manuel.
  async function startMusic({ auto = false } = {}) {
    if (!music) return;

    if (auto) {
      if (musicAutoStarted) return;
      musicAutoStarted = true;
    }

    if (!music.paused) return;

    try {
      await music.play();
    } catch (error) {
      // Si ça échoue, on autorise une nouvelle tentative au prochain clic.
      if (auto) musicAutoStarted = false;
      console.warn("Musique bloquée ou introuvable :", error);
    }

    updateMusicUI();
  }

  /* OUVERTURE DE L'ENVELOPPE */

  function openIntro() {
    if (introOpened) return;

    introOpened = true;

    // Le clic sur le sceau est un geste utilisateur : la musique peut démarrer.
    startMusic({ auto: true });

    if (envelope) {
      envelope.classList.add("opened");
    }

    if (hint) {
      hint.textContent = "A little note for you…";
    }

    // Laisser le temps à l'animation de l'enveloppe.
    setTimeout(() => {
      opening.classList.remove("active");
      opening.setAttribute("aria-hidden", "true");

      if (intro) {
        intro.hidden = false;
        intro.setAttribute("aria-hidden", "false");
        intro.scrollTo({ top: 0, left: 0, behavior: "instant" });

        // Permettre la transition CSS.
        void intro.offsetWidth;

        intro.classList.add("active");
      } else {
        // Solution de secours si l'introduction
        // n'existe pas encore dans index.html.
        enterScrapbook();
      }
    }, 850);
  }

  /* PASSAGE DE L'INTRODUCTION À L'ALBUM */

  function enterScrapbook() {
    if (intro) {
      intro.classList.remove("active");
      intro.setAttribute("aria-hidden", "true");
      intro.hidden = true;
    }

    opening.classList.remove("active");
    opening.setAttribute("aria-hidden", "true");

    scrapbook.hidden = false;
    scrapbook.setAttribute("aria-hidden", "false");

    // Préparer l'apparition de l'album.
    void scrapbook.offsetWidth;

    scrapbook.classList.add("active");

    // Afficher automatiquement le premier chapitre
    // et lancer immédiatement ses animations.
    showChapter(0, false);
  }

  /* NAVIGATION ENTRE LES CHAPITRES */

  function showChapter(index, showMessage = true) {
    activeIndex = Math.max(0, Math.min(chapters.length - 1, index));

    // Play only the clips on the page being shown.
    syncVideos(chapters[activeIndex]);

    // Afficher uniquement le chapitre sélectionné.
    chapters.forEach((chapter, i) => {
      const isActive = i === activeIndex;

      chapter.hidden = !isActive;
      chapter.classList.toggle("visible", isActive);
      chapter.setAttribute("aria-hidden", String(!isActive));
    });

    // Toujours repartir du début de la nouvelle page.
    scrollToTop();
    requestAnimationFrame(scrollToTop);

    // Mettre à jour les indicateurs de progression.
    dots.forEach((dot, i) => {
      const isActive = i === activeIndex;

      dot.classList.toggle("active", isActive);

      if (isActive) {
        dot.setAttribute("aria-current", "step");
      } else {
        dot.removeAttribute("aria-current");
      }
    });

    // Mettre à jour le numéro du chapitre.
    if (currentChapter) {
      currentChapter.textContent = String(activeIndex + 1).padStart(2, "0");
    }

    // Gérer le bouton précédent.
    if (previous) {
      previous.disabled = activeIndex === 0;
    }

    // Mettre à jour le bouton suivant.
    if (next) {
      next.disabled = false;

      const labels = next.querySelectorAll("span");

      if (labels.length > 0) {
        labels[0].textContent =
          activeIndex === chapters.length - 1 ? "END" : "NEXT";
      }
    }

    // Les paragraphes apparaissent automatiquement
    revealChapter(activeIndex);

    if (showMessage) {
      showHint(
        activeIndex === chapters.length - 1
          ? "One last little thing…"
          : "Turn the page, whenever you’re ready.",
      );
    }

    // Déclencher les confettis sur la dernière page.
    if (activeIndex === chapters.length - 1) {
      launchConfetti();
    }
  }

  /* CONFETTIS DISCRETS */

  function launchConfetti() {
    if (!confettiLayer) return;

    // Éviter de lancer plusieurs animations simultanément.
    if (confettiLayer.dataset.launched === "yes") {
      return;
    }

    confettiLayer.dataset.launched = "yes";
    confettiLayer.innerHTML = "";

    const colors = ["#b88a53", "#d7bd8a", "#8d6248", "#e7d9bc"];

    for (let i = 0; i < 30; i++) {
      const piece = document.createElement("span");

      piece.className = "confetti-piece";

      piece.style.left = `${Math.random() * 100}%`;

      piece.style.setProperty("--confetti-color", colors[i % colors.length]);

      piece.style.setProperty("--delay", `${Math.random() * 1.2}s`);

      piece.style.setProperty("--drift", `${Math.random() * 90 - 45}px`);

      confettiLayer.appendChild(piece);
    }

    clearTimeout(confettiTimer);

    confettiTimer = setTimeout(() => {
      confettiLayer.innerHTML = "";
      delete confettiLayer.dataset.launched;
    }, 5000);
  }

  /* ÉVÉNEMENTS */

  // Ouvrir l'enveloppe en cliquant sur son sceau.
  if (seal) {
    seal.addEventListener("click", (event) => {
      event.stopPropagation();
      openIntro();
    });
  }

  // Permettre également de cliquer sur l'enveloppe.
  if (envelope) {
    envelope.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;

      openIntro();
    });
  }

  // Passer de l'introduction à l'album ("Get started") : la musique démarre ici
  // si elle n'a pas déjà été lancée à l'ouverture de l'enveloppe.
  if (continueButton) {
    continueButton.addEventListener("click", () => {
      startMusic({ auto: true });
      enterScrapbook();
    });
  }

  // Chapitre précédent.
  if (previous) {
    previous.addEventListener("click", () => {
      if (activeIndex > 0) {
        showChapter(activeIndex - 1);
      }
    });
  }

  // Chapitre suivant.
  if (next) {
    next.addEventListener("click", () => {
      if (activeIndex < chapters.length - 1) {
        showChapter(activeIndex + 1);
      } else {
        showHint("You can read your little collection again anytime.");
      }
    });
  }

  // Navigation par les points de progression.
  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      const dataIndex = dot.dataset.goTo;

      const targetIndex = dataIndex !== undefined ? Number(dataIndex) : index;

      if (
        Number.isInteger(targetIndex) &&
        targetIndex >= 0 &&
        targetIndex < chapters.length
      ) {
        showChapter(targetIndex);
      }
    });
  });

  // Revenir au premier chapitre.
  if (restartButton) {
    restartButton.addEventListener("click", () => {
      showChapter(0);
    });
  }

  // Bouton musique
  if (musicToggle && music) {
    musicToggle.addEventListener("click", async () => {
      // A manual toggle overrides the automatic resume after a video.
      musicPausedForVideo = false;

      if (music.paused) {
        await startMusic();
      } else {
        music.pause();
      }

      updateMusicUI();
    });

    ["play", "pause", "ended"].forEach((eventName) => {
      music.addEventListener(eventName, updateMusicUI);
    });
  }

  updateMusicUI();

  /* ÉTAT INITIAL */

  if (intro) {
    intro.hidden = true;
    intro.classList.remove("active");
    intro.setAttribute("aria-hidden", "true");
  }

  // L'album reste caché jusqu'à la fin de l'introduction.
  scrapbook.hidden = true;
  scrapbook.classList.remove("active");
  scrapbook.setAttribute("aria-hidden", "true");

  // Préparer les chapitres.
  chapters.forEach((chapter, index) => {
    chapter.hidden = index !== 0;

    chapter.setAttribute("aria-hidden", String(index !== 0));
  });

/* VIDÉOS */

// Collage clips loop silently while their chapter is open. Tapping one turns
// its sound on and pauses the song; tapping it again mutes it and the song resumes.
let musicPausedForVideo = false;

function setClipSound(video, on) {
  video.muted = !on;

  const clip = video.closest(".memory-clip");
  const hint = clip && clip.querySelector(".sound-hint");

  if (clip) clip.classList.toggle("has-sound", on);
  if (hint) hint.textContent = on ? "sound on" : "tap for sound";
}

function muteAllClips() {
  videos.forEach((video) => setClipSound(video, false));

  if (musicPausedForVideo) {
    musicPausedForVideo = false;
    startMusic();
  }
}

function syncVideos(chapter) {
  muteAllClips();

  videos.forEach((video) => {
    if (chapter && chapter.contains(video)) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  });
}

videos.forEach((video) => {
  const clip = video.closest(".memory-clip");

  clip.addEventListener("click", () => {
    if (!video.muted) {
      muteAllClips();
      return;
    }

    videos.forEach((other) => setClipSound(other, false));
    setClipSound(video, true);
    video.currentTime = 0;
    video.play().catch(() => {});

    if (music && !music.paused) {
      musicPausedForVideo = true;
      music.pause();
    }
  });

  // Drop clips this browser can't play (e.g. HEVC on some Android/Windows).
  // The load may already have failed before this script ran, so check now too.
  const hide = () => clip.remove();

  if (video.error) {
    hide();
  } else {
    video.addEventListener("error", hide);
  }
});

/* CLAVIER ET GLISSEMENT */

document.addEventListener("keydown", (event) => {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey)
    return;
  if (event.target.closest("input, textarea, select, video")) return;

  const key = event.key;
  const onButton = Boolean(event.target.closest("button"));
  const isAction = key === "Enter" || key === " ";

  // Entrée / Espace sur un bouton : le navigateur gère déjà le clic.
  if (onButton && isAction) return;

  // 1. Enveloppe
  if (opening.classList.contains("active")) {
    if (isAction || key === "ArrowRight") {
      event.preventDefault();
      openIntro();
    }
    return;
  }

  // 2. Introduction
  if (intro && intro.classList.contains("active")) {
    if (isAction || key === "ArrowRight") {
      event.preventDefault();
      if (continueButton) continueButton.click();
    }
    return;
  }

  // 3. Album
  if (!scrapbook.classList.contains("active")) return;

  if (key === "ArrowRight" || key === "PageDown" || isAction) {
    event.preventDefault();
    if (next) next.click();
  } else if (key === "ArrowLeft" || key === "PageUp") {
    event.preventDefault();
    if (previous) previous.click();
  } else if (key === "Home") {
    event.preventDefault();
    showChapter(0);
  } else if (key === "End") {
    event.preventDefault();
    showChapter(chapters.length - 1);
  }
});

// Glisser le doigt sur mobile : gauche = suivant, droite = précédent
let touchStartX = 0;
let touchStartY = 0;
let touchStartedOnVideo = false;

scrapbook.addEventListener(
  "touchstart",
  (event) => {
    touchStartedOnVideo = Boolean(event.target.closest("video"));
    touchStartX = event.changedTouches[0].clientX;
    touchStartY = event.changedTouches[0].clientY;
  },
  { passive: true },
);

scrapbook.addEventListener(
  "touchend",
  (event) => {
    // Scrubbing a video shouldn't turn the page.
    if (touchStartedOnVideo) return;

    const dx = event.changedTouches[0].clientX - touchStartX;
    const dy = event.changedTouches[0].clientY - touchStartY;

    // Ignorer les petits gestes et les défilements verticaux
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;

    if (dx < 0 && next) next.click();
    if (dx > 0 && previous) previous.click();
  },
  { passive: true },
);
})();
