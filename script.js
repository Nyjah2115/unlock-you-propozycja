// Unlock You — płynne przewijanie, ekran wejścia, menu na telefonie, animacje przy przewijaniu, formularz.
const UY_RUCH = !matchMedia("(prefers-reduced-motion: reduce)").matches;

// Płynne przewijanie (Lenis, vendor/lenis.min.js). Na dotyku zostaje zwykłe przewijanie telefonu.
const uyLenis = (() => {
  if (!UY_RUCH || !window.Lenis) return null;
  const lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 1 });
  const klatka = t => { lenis.raf(t); requestAnimationFrame(klatka); };
  requestAnimationFrame(klatka);
  // linki do miejsc na tej samej stronie (np. #zapisy) też płynnie
  document.addEventListener("click", e => {
    const a = e.target.closest('a[href*="#"]');
    if (!a) return;
    const url = new URL(a.href, location.href);
    if (url.pathname !== location.pathname || url.hash.length < 2) return;
    const cel = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!cel) return;
    e.preventDefault();
    lenis.scrollTo(cel, { offset: -16, duration: 1.4 });
    history.pushState(null, "", url.hash);
  });
  return lenis;
})();

// Ekran wejścia (tylko strona główna, raz na wizytę): klik albo Esc pomija.
(() => {
  const html = document.documentElement;
  const intro = document.querySelector(".intro");
  if (!intro) return;
  if (!html.classList.contains("intro-start")) { intro.remove(); return; }
  uyLenis?.stop();
  let koniec = false, drzwi = false;
  // sygnał dla animacji przewijania: drzwi się otwierają, zabytki mogą zacząć się rysować
  const otworz = () => { if (!drzwi) { drzwi = true; document.dispatchEvent(new Event("uy-drzwi")); } };
  const zakoncz = pominiete => {
    if (koniec) return;
    koniec = true;
    if (pominiete) html.classList.add("intro-pominiete");
    intro.remove();
    otworz();
    uyLenis?.start();
  };
  intro.addEventListener("click", () => zakoncz(true));
  document.addEventListener("keydown", e => { if (e.key === "Escape") zakoncz(true); });
  setTimeout(otworz, 2000);
  setTimeout(() => zakoncz(false), 3200);
})();

// Menu na telefonie i tablecie.
(() => {
  const naglowek = document.querySelector(".naglowek");
  const burger = document.querySelector(".naglowek__burger");
  if (!naglowek || !burger) return;
  const ustaw = otwarte => {
    naglowek.classList.toggle("otwarte", otwarte);
    burger.setAttribute("aria-expanded", String(otwarte));
  };
  burger.addEventListener("click", () => ustaw(!naglowek.classList.contains("otwarte")));
  document.querySelectorAll("#menu a").forEach(a => a.addEventListener("click", () => ustaw(false)));
  document.addEventListener("keydown", e => { if (e.key === "Escape") ustaw(false); });
  matchMedia("(min-width: 1021px)").addEventListener("change", e => { if (e.matches) ustaw(false); });
})();

// Animacje przy przewijaniu: element dostaje klasę .widac, gdy pojawi się na ekranie
// (klucz się obraca, zabytki „rysują się”, nagłówki i zdjęcia się odsłaniają).
// Pozycję sprawdzamy przez getBoundingClientRect (IntersectionObserver nie widzi elementów schowanych maską clip-path).
(() => {
  const czekaja = new Set(document.querySelectorAll(".ornament, .panorama, .panorama__jezyk, .pojaw, .pojaw-tytul, .pojaw-zdjecie, .pojaw-blok, .szkola__herb"));
  document.documentElement.classList.add("anim-ok");
  let zaplanowane = false;
  const sprawdz = () => {
    zaplanowane = false;
    const granica = innerHeight * 0.9;
    for (const e of czekaja) {
      const r = e.getBoundingClientRect();
      if (r.top < granica) { e.classList.add("widac"); czekaja.delete(e); }
    }
    if (!czekaja.size) { removeEventListener("scroll", plan); removeEventListener("resize", plan); }
  };
  const plan = () => { if (!zaplanowane) { zaplanowane = true; requestAnimationFrame(sprawdz); } };
  addEventListener("scroll", plan, { passive: true });
  addEventListener("resize", plan);
  // przy ekranie wejścia czekamy, aż drzwi się otworzą — inaczej zabytki narysowałyby się pod nimi
  if (document.querySelector(".intro") && document.documentElement.classList.contains("intro-start")) {
    document.addEventListener("uy-drzwi", sprawdz, { once: true });
  } else {
    sprawdz();
  }
})();

// Formularz zapisu. W propozycji nic nie jest wysyłane: sprawdzamy pola i pokazujemy potwierdzenie.
// Przy wdrożeniu podpiąć wysyłkę (np. skrypt PHP na serwerze albo usługę formularzy).
document.querySelectorAll(".formularz").forEach(f => {
  f.addEventListener("submit", e => {
    e.preventDefault();
    const blad = f.querySelector(".formularz__blad");
    const { imie, telefon, email } = f.elements;
    const braki = [];
    [imie, telefon, email].forEach(p => p.removeAttribute("aria-invalid"));
    if (!imie.value.trim()) { braki.push("imię"); imie.setAttribute("aria-invalid", "true"); }
    if (telefon.value.replace(/\D/g, "").length < 9) { braki.push("numer telefonu"); telefon.setAttribute("aria-invalid", "true"); }
    if (email.value.trim() && !email.checkValidity()) { braki.push("poprawny adres e-mail"); email.setAttribute("aria-invalid", "true"); }
    if (braki.length) {
      blad.textContent = "Uzupełnij: " + braki.join(", ") + ".";
      blad.hidden = false;
      f.querySelector('[aria-invalid="true"]').focus();
      return;
    }
    blad.hidden = true;
    f.classList.add("wyslany");
    f.querySelector(".formularz__ok").hidden = false;
  });
});
