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

// Nagłówki: każde słowo w osobnej „masce”, żeby mogło wysunąć się spod linii (CSS: .maska, .maska__w).
(() => {
  if (!UY_RUCH) return;
  document.querySelectorAll(".pojaw-tytul").forEach(h => {
    let i = 0;
    const podziel = wezel => {
      for (const n of [...wezel.childNodes]) {
        if (n.nodeType === 1) { podziel(n); continue; }
        if (n.nodeType !== 3) continue;
        const frag = document.createDocumentFragment();
        for (const kawalek of n.textContent.split(/( +)/)) {
          if (!kawalek) continue;
          if (/^ +$/.test(kawalek)) { frag.append(kawalek); continue; }
          const m = document.createElement("span"); m.className = "maska";
          const w = document.createElement("span"); w.className = "maska__w"; w.style.setProperty("--i", i++); w.textContent = kawalek;
          m.append(w); frag.append(m);
        }
        n.replaceWith(frag);
      }
    };
    podziel(h);
  });
})();

// Zdanie „Nie uczymy tylko języków…”: słowa ciemnieją po kolei w miarę przewijania.
(() => {
  const el = document.querySelector("[data-podswietl]");
  if (!el || !UY_RUCH) return;
  const slowa = el.textContent.trim().split(/ +/);
  el.textContent = "";
  const spany = slowa.map((s, i) => {
    const sp = document.createElement("span"); sp.className = "slowo"; sp.textContent = s;
    el.append(sp); if (i < slowa.length - 1) el.append(" ");
    return sp;
  });
  let czeka = false;
  const odswiez = () => {
    czeka = false;
    const r = el.getBoundingClientRect(), h = innerHeight;
    const p = Math.min(1, Math.max(0, (h * 0.82 - r.top) / (r.height + h * 0.32)));
    const n = p * spany.length;
    spany.forEach((s, i) => { s.style.opacity = (0.16 + 0.84 * Math.min(1, Math.max(0, n - i))).toFixed(3); });
  };
  addEventListener("scroll", () => { if (!czeka) { czeka = true; requestAnimationFrame(odswiez); } }, { passive: true });
  addEventListener("resize", odswiez);
  odswiez();
})();

// Scena (jak w ODNOVA): zdjęcie przypięte na cały ekran i lekko dryfuje, hasło odsłania się litera po literze
// w miarę przewijania (od 2% do 36% postępu sceny), a tekst odjeżdża w górę, ZANIM kremowa sekcja (łuk) dosięgnie jego dołu.
(() => {
  const sceny = [...document.querySelectorAll(".scena")].map(el => ({
    el, img: el.querySelector(".scena__media img"), tekst: el.querySelector(".scena__tekst"),
    next: el.nextElementSibling, litery: [], odslon: -1, dol: 0,
  }));
  if (!sceny.length) return;
  for (const s of sceny) {
    const h = s.el.querySelector(".scena__tytul");
    if (!h || !UY_RUCH) continue;
    const slowa = h.textContent.trim().split(/\s+/);
    h.textContent = "";
    slowa.forEach((slowo, i) => {
      const w = document.createElement("span"); w.className = "w";
      for (const znak of slowo) {
        const l = document.createElement("span"); l.className = "l";
        const it = document.createElement("i"); it.textContent = znak;
        l.append(it); w.append(l);
      }
      h.append(w);
      if (i < slowa.length - 1) h.append(" ");
    });
    h.setAttribute("aria-label", slowa.join(" "));
    s.litery = [...h.querySelectorAll(".l > i")];
  }
  const zmierz = () => {
    for (const s of sceny) {
      const bylo = s.tekst.style.transform;
      s.tekst.style.transform = "none";
      const a = s.tekst.getBoundingClientRect(), z = s.tekst.lastElementChild.getBoundingClientRect();
      s.dol = Math.round(z.bottom - a.top);
      s.tekst.style.transform = bylo;
    }
  };
  let czeka = false;
  const tik = () => {
    czeka = false;
    const vh = innerHeight;
    for (const s of sceny) {
      const r = s.el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) continue;
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, s.el.offsetHeight - vh)));
      if (!UY_RUCH) continue;
      s.img.style.setProperty("--py", ((p - 0.5) * -7).toFixed(2) + "%");
      if (s.litery.length) {
        const ile = Math.round(Math.min(1, Math.max(0, (p - 0.02) / 0.34)) * s.litery.length);
        if (ile !== s.odslon) { s.litery.forEach((l, i) => l.classList.toggle("lit", i < ile)); s.odslon = ile; }
      }
      let wyjscie = 0;
      if (s.next) {
        const start = vh + 120, koniec = Math.min(s.dol + 60, vh - 40);
        wyjscie = Math.min(1, Math.max(0, (start - s.next.getBoundingClientRect().top) / Math.max(1, start - koniec)));
      }
      s.tekst.style.opacity = (1 - wyjscie).toFixed(3);
      s.tekst.style.transform = `translateY(${(-wyjscie * 70).toFixed(1)}px)`;
    }
  };
  zmierz();
  addEventListener("resize", () => { zmierz(); tik(); });
  addEventListener("scroll", () => { if (!czeka) { czeka = true; requestAnimationFrame(tik); } }, { passive: true });
  tik();
})();

// Paralaksa: element przesuwa się wolniej (albo szybciej) niż strona — data-paralaksa = współczynnik.
(() => {
  const el = [...document.querySelectorAll("[data-paralaksa]")];
  if (!el.length || !UY_RUCH) return;
  let czeka = false;
  const ustaw = () => {
    czeka = false;
    for (const e of el) {
      const r = e.getBoundingClientRect();
      const y = (r.top + r.height / 2 - innerHeight / 2) * Number(e.dataset.paralaksa);
      e.style.translate = `0 ${Math.max(-40, Math.min(40, y)).toFixed(1)}px`; // najwyżej ±40 px, żeby nie nachodził na cytat
    }
  };
  addEventListener("scroll", () => { if (!czeka) { czeka = true; requestAnimationFrame(ustaw); } }, { passive: true });
  ustaw();
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

// Zapisy krok po kroku: język → dla kogo → forma i miejsce → kontakt → podziękowanie.
// W propozycji nic nie jest wysyłane (Dawid 9.11: „na razie bez wysyłki”). Przy wdrożeniu podpiąć wysyłkę w miejscu oznaczonym niżej.
// Ceny orientacyjne z ich cennika: A = angielski, hiszpański, polski (korepetycje); B = niemiecki, polski dla obcokrajowców.
const UY_CENY = {
  A: { dziecko: [75, 45, "45 min"], mlodziez: [90, 55, "1 h"], dorosly: [100, 65, "1 h"] },
  B: { dziecko: [80, 55, "45 min"], mlodziez: [95, 65, "1 h"], dorosly: [110, 75, "1 h"] },
};
document.querySelectorAll(".kroki-zapisu").forEach(f => {
  const kroki = [...f.querySelectorAll(".krok")];
  const pasek = [...f.querySelectorAll(".kroki-zapisu__pasek li")];
  const wstecz = f.querySelector(".krok__wstecz");
  const startowy = f.dataset.jezyk ? 2 : 1;
  let akt = startowy;
  const wybor = nazwa => {
    const r = f.querySelector(`input[name="${nazwa}"]:checked`);
    return r ? { w: r.value, t: r.closest(".opcja").querySelector("strong").textContent } : null;
  };
  const podsumowanie = () => {
    const [j, k, fo, m] = ["jezyk", "kto", "forma", "miejsce"].map(wybor);
    const lista = [j, k, fo, m].filter(Boolean).map(x => `<li>${x.t}</li>`).join("");
    let cena = "";
    if (k && k.w === "firma") cena = "Cena dla firm ustalana indywidualnie.";
    else if (j && k && fo) {
      const grupa = j.w === "niemiecki" || (j.w === "polski" && k.w === "dorosly") ? "B" : "A";
      const [ind, gr, czas] = UY_CENY[grupa][k.w];
      cena = `Orientacyjnie ${fo.w === "grupa" ? gr : ind} zł za lekcję (${czas}).`;
    }
    const html = `<ul>${lista}</ul>` + (cena ? `<p class="podsumowanie__cena">${cena}<a href="${f.dataset.cennik}">Cennik</a></p>` : "");
    f.querySelectorAll(".krok__podsumowanie").forEach(p => { p.innerHTML = html; });
  };
  const pokaz = (n, przewin = true) => {
    akt = n;
    kroki.forEach(k => { k.hidden = Number(k.dataset.krok) !== n; k.classList.remove("wchodzi"); });
    pasek.forEach((li, i) => { li.classList.toggle("zrobione", i + 1 < n); li.classList.toggle("teraz", i + 1 === n); });
    wstecz.hidden = n === 1 || n === 5;
    if (n >= 4) podsumowanie();
    const aktywny = kroki.find(k => !k.hidden);
    void aktywny.offsetWidth; aktywny.classList.add("wchodzi");
    if (przewin) {
      const top = f.getBoundingClientRect().top;
      if (top < 0 || top > innerHeight * 0.6) (uyLenis ? uyLenis.scrollTo(f, { offset: -90 }) : f.scrollIntoView({ block: "start" }));
    }
  };
  f.classList.add("kroki-zapisu--aktywne");
  f.addEventListener("change", e => {
    const k = Number(e.target.closest(".krok")?.dataset.krok);
    if (k === 1 || k === 2) setTimeout(() => pokaz(k + 1), 240);
    if (k === 3 && wybor("forma") && wybor("miejsce")) setTimeout(() => pokaz(4), 240);
  });
  wstecz.addEventListener("click", () => pokaz(Math.max(1, akt - 1)));
  f.querySelector(".krok__od-nowa").addEventListener("click", () => {
    f.reset();
    if (f.dataset.jezyk) f.querySelector(`input[name="jezyk"][value="${f.dataset.jezyk}"]`).checked = true;
    f.querySelector(".krok__imie").textContent = "";
    pokaz(startowy);
  });
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
    // TU przy wdrożeniu: wysłanie zgłoszenia (np. fetch do skryptu na serwerze szkoły).
    f.querySelector(".krok__imie").textContent = ", " + imie.value.trim().split(" ")[0];
    pokaz(5);
  });
  pokaz(startowy, false);
});
