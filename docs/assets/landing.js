const root = document.querySelector("#app");

const trips = [
  {
    href: "./trips/kopenhagen/",
    title: "Kopenhagen",
    dates: "06.–09. Juli 2026",
    subtitle: "Kanäle, Design, Hafen und nordisches Stadtgefühl.",
    image: "./photos/web/aerial-1200.jpg",
    meta: "4 Tage · Christian & Silke",
  },
  {
    href: "./trips/rom/",
    title: "Rom",
    dates: "05.–06. September 2026",
    subtitle: "Antike, Barock und zeitgenössische Architektur.",
    image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1400&q=85",
    meta: "2 Tage · Christian & Julia · Testaufenthalt",
  },
];

const esc = (value = "") => String(value).replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));

document.title = "Meine Reisen";
root.innerHTML = `<main class="trip-index"><div class="index-intro"><p class="eyebrow">Reiseplaner</p><h1>Meine Reisen</h1><p>Jede Reise hat ihren eigenen Bereich. Bilder, Tagespläne, Wetter und stabile Termin-UIDs bleiben je Reise getrennt.</p></div><div class="trip-grid">${trips.map((trip) => `<a class="trip-tile" href="${trip.href}"><img src="${trip.image}" alt="${esc(trip.title)}"><span class="trip-tile-shade"></span><div><p class="eyebrow">${esc(trip.dates)}</p><h2>${esc(trip.title)}</h2><p>${esc(trip.subtitle)}</p><small>${esc(trip.meta)} · Reise öffnen →</small></div></a>`).join("")}</div></main>`;
