const map = L.map('map', {
    minZoom: 14,
    zoomControl: false,
    maxBounds: [
        [48.882, 12.915],
        [48.810, 13.010]
    ],
    maxBoundsViscosity: 1.0
}).setView([48.837, 12.962], 14);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

const categoryConfig = {
    "Behörden": { color: "#3498db", emoji: "🏛️" },
    "Schulen und Hochschulen": { color: "#9b59b6", emoji: "🎓" },
    "Integrationskurse Deggendorf": { color: "#e67e22", emoji: "🗣️" },
    "Gesundheit": { color: "#e74c3c", emoji: "🏥" },
    "Soziales": { color: "#27ae60", emoji: "🤝" },
    "Vereine und Gemeinschaft": { color: "#16a085", emoji: "🌍" }
};

// ── Хелпер: активна категорія (одна, radio) ───────────────────────
function getActiveCategory() {
    const radio = document.querySelector('.category-filter:checked');
    return radio ? radio.value : null;
}

// ── Хелпер: entries що відповідають активній категорії ────────────
function getActiveEntries(entries) {
    const active = getActiveCategory();
    return entries.filter(({ category }) => category === active);
}

function createIcon(category) {
    const config = categoryConfig[category] || { color: "#555", emoji: "📍" };
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" width="32" height="42">
            <path d="M16 0 C7.2 0 0 7.2 0 16 C0 26 16 42 16 42 C16 42 32 26 32 16 C32 7.2 24.8 0 16 0Z"
                  fill="${config.color}" stroke="white" stroke-width="2"/>
            <text x="16" y="21" text-anchor="middle" font-size="14" dominant-baseline="middle">${config.emoji}</text>
        </svg>
    `;
    return L.divIcon({
        html: svg,
        className: '',
        iconSize: [32, 42],
        iconAnchor: [16, 42],
        popupAnchor: [0, -44]
    });
}

function formatHours(record) {
    const days = [
        { label: "Mo", key: "Montag" },
        { label: "Di", key: "Dienstag" },
        { label: "Mi", key: "Mittwoch" },
        { label: "Do", key: "Donnerstag" },
        { label: "Fr", key: "Freitag" }
    ];
    const hasAnyHours = days.some(d => record[d.key]);
    if (!hasAnyHours) return "";
    const rows = days
        .filter(d => record[d.key])
        .map(d => `<tr><td class="popup-day">${d.label}</td><td>${record[d.key].replace(/;/g, ", ")}</td></tr>`)
        .join("");
    return `<table class="popup-hours">${rows}</table>`;
}

function buildCard(record, category, index, total) {
    const description = record["Beschreibung"] || record["Beshreibung"] || "";
    const phone = record["Telefonnummer"];
    const email = record["E-Mail-Adresse"];
    const website = record["Website"];
    const hours = formatHours(record);
    const config = categoryConfig[category];

    let html = `<div class="popup-content">`;

    if (total > 1) {
        html += `<div class="popup-counter-bar">${index + 1} / ${total}</div>`;
    }

    html += `<div class="popup-category" style="background:${config.color}">${config.emoji} ${category}</div>`;
    html += `<h3 class="popup-title">${record["Name"]}</h3>`;
    html += `<p class="popup-address">📍 ${record["Adresse"]}</p>`;

    if (description) html += `<p class="popup-desc">${description}</p>`;
    if (hours) html += `<div class="popup-section"><strong>Öffnungszeiten</strong>${hours}</div>`;

    html += `<div class="popup-contacts">`;
    if (phone) html += `<a href="tel:${phone}" class="popup-btn">📞 ${phone}</a>`;
    if (email) html += `<a href="mailto:${email}" class="popup-btn">✉️ ${email}</a>`;
    if (website) html += `<a href="${website}" target="_blank" class="popup-btn popup-btn-web">🌐 Website</a>`;
    html += `</div>`;

    if (record["Deutschklasse"] === true) {
        html += `<div class="popup-badge">✅ Deutschklasse vorhanden</div>`;
    }

    html += `</div>`;
    return html;
}

// ── Зовнішні стрілки ──────────────────────────────────────────────
const arrowLeft  = document.createElement('button');
const arrowRight = document.createElement('button');
arrowLeft.className  = 'popup-arrow popup-arrow-left';
arrowRight.className = 'popup-arrow popup-arrow-right';
arrowLeft.innerHTML  = '&#8249;';
arrowRight.innerHTML = '&#8250;';
document.getElementById('map').appendChild(arrowLeft);
document.getElementById('map').appendChild(arrowRight);

L.DomEvent.disableClickPropagation(arrowLeft);
L.DomEvent.disableClickPropagation(arrowRight);

let currentState = null; // { allEntries, activeEntries, index, marker }

function updateArrows() {
    if (!currentState || currentState.activeEntries.length <= 1) {
        arrowLeft.classList.remove('visible');
        arrowRight.classList.remove('visible');
        return;
    }

    const popupEl = currentState.marker.getPopup().getElement();
    if (!popupEl) {
        arrowLeft.classList.remove('visible');
        arrowRight.classList.remove('visible');
        return;
    }

    const rect    = popupEl.getBoundingClientRect();
    const mapRect = document.getElementById('map').getBoundingClientRect();

    const top      = rect.top  - mapRect.top  + rect.height / 2 - 23;
    const leftPos  = rect.left - mapRect.left - 52;
    const rightPos = rect.right - mapRect.left + 6;

    arrowLeft.style.top   = top + 'px';
    arrowLeft.style.left  = leftPos + 'px';
    arrowRight.style.top  = top + 'px';
    arrowRight.style.left = rightPos + 'px';

    arrowLeft.classList.add('visible');
    arrowRight.classList.add('visible');

    arrowLeft.disabled  = currentState.index === 0;
    arrowRight.disabled = currentState.index === currentState.activeEntries.length - 1;
}

function navigate(direction) {
    if (!currentState) return;
    currentState.index = Math.max(0, Math.min(currentState.activeEntries.length - 1, currentState.index + direction));
    const { record, category } = currentState.activeEntries[currentState.index];

    const popupEl = currentState.marker.getPopup().getElement();
    const wrapper = popupEl && popupEl.querySelector('.leaflet-popup-content');
    if (wrapper) {
        wrapper.innerHTML = buildCard(record, category, currentState.index, currentState.activeEntries.length);
    }
    updateArrows();
}

arrowLeft.addEventListener('click',  () => navigate(-1));
arrowRight.addEventListener('click', () => navigate(1));

map.on('popupclose', () => {
    arrowLeft.classList.remove('visible');
    arrowRight.classList.remove('visible');
    currentState = null;
});

map.on('move', updateArrows);

// ── Список установ ────────────────────────────────────────────────
const locationListEl    = document.getElementById('location-list');
const locationListInner = document.getElementById('location-list-inner');

// Позиціонуємо #location-list прямо під #filter-panel з тією ж шириною
function positionLocationList() {
    const panel    = document.getElementById('filter-panel');
    const rect     = panel.getBoundingClientRect();
    const mainRect = document.getElementById('main-content').getBoundingClientRect();

    locationListEl.style.top   = (rect.bottom - mainRect.top + 12) + 'px';
    locationListEl.style.width = rect.width + 'px';
}

// Відкрити попап на конкретній картці
function openPopupForRecord(marker, targetName, targetCategory) {
    map.closePopup();
    map.setView(marker.getLatLng(), Math.max(map.getZoom(), 16), { animate: true, duration: 0.5 });

    setTimeout(() => {
        marker.openPopup();

        // Після того як popupopen відпрацював — переключаємо на потрібну картку
        requestAnimationFrame(() => {
            const state = currentState;
            if (!state) return;

            const idx = state.activeEntries.findIndex(
                e => e.record["Name"] === targetName && e.category === targetCategory
            );
            if (idx !== -1 && idx !== state.index) {
                state.index = idx;
                const { record, category } = state.activeEntries[idx];
                const popupEl = marker.getPopup().getElement();
                const wrapper = popupEl && popupEl.querySelector('.leaflet-popup-content');
                if (wrapper) {
                    wrapper.innerHTML = buildCard(record, category, idx, state.activeEntries.length);
                }
                updateArrows();
            }
        });
    }, 550);
}

function renderLocationList(category, allData) {
    positionLocationList();
    locationListInner.innerHTML = '';

    const config  = categoryConfig[category] || { color: "#555" };
    const records = allData[category] || [];

    if (records.length === 0) {
        locationListEl.classList.remove('visible');
        return;
    }

    records.forEach(record => {
        const name = record["Name"];
        if (!name) return;

        // Знаходимо відповідний маркер через popupState
        let targetMarker = null;
        for (const state of Object.values(popupState)) {
            const match = state.allEntries.find(
                e => e.record["Name"] === name && e.category === category
            );
            if (match) { targetMarker = state.marker; break; }
        }

        const item = document.createElement('div');
        item.className = 'location-item';
        item.innerHTML = `
            <span class="location-item-dot" style="background:${config.color}"></span>
            <span>${name}</span>
        `;

        if (targetMarker) {
            item.addEventListener('click', () => {
                openPopupForRecord(targetMarker, name, category);
            });
        }

        locationListInner.appendChild(item);
    });

    locationListEl.classList.add('visible');
}

// ── Дані ──────────────────────────────────────────────────────────
const popupState        = {};
const markersByCategory = {};
let   allDataGlobal     = null;

fetch('data/processed.json')
    .then(res => res.json())
    .then(data => {
        allDataGlobal = data;
        const coordMap = {};

        Object.entries(data).forEach(([category, records]) => {
            records.forEach(record => {
                if (!record.lat || !record.lon) return;
                const key = `${record.lat},${record.lon}`;
                if (!coordMap[key]) coordMap[key] = [];
                coordMap[key].push({ record, category });
            });
        });

        Object.entries(coordMap).forEach(([key, entries]) => {
            const [lat, lon] = key.split(',').map(Number);

            const initialActive = getActiveEntries(entries);
            const iconCategory  = (initialActive[0] || entries[0]).category;

            const marker = L.marker([lat, lon], { icon: createIcon(iconCategory) });
            popupState[key] = { index: 0, allEntries: entries, marker };

            marker.bindPopup('', { maxWidth: 320, className: 'custom-popup' });

            marker.on('popupopen', () => {
                const state         = popupState[key];
                const activeEntries = getActiveEntries(state.allEntries);

                state.index         = 0;
                state.activeEntries = activeEntries;
                currentState        = state;

                const popupEl = marker.getPopup().getElement();
                const wrapper = popupEl && popupEl.querySelector('.leaflet-popup-content');
                if (wrapper && activeEntries.length > 0) {
                    wrapper.innerHTML = buildCard(
                        activeEntries[0].record, activeEntries[0].category, 0, activeEntries.length
                    );
                }

                requestAnimationFrame(() => {
                    updateArrows();

                    const popupElCheck = marker.getPopup().getElement();
                    if (popupElCheck) {
                        const headerEl  = document.querySelector('header');
                        const headerH   = headerEl ? headerEl.offsetHeight : 0;
                        const padding   = 16;
                        const popupRect = popupElCheck.getBoundingClientRect();
                        const mapRect   = document.getElementById('map').getBoundingClientRect();
                        const topEdge   = popupRect.top - mapRect.top;

                        if (topEdge < headerH + padding) {
                            const offset = headerH + padding - topEdge;
                            map.panBy([0, -offset], { animate: true, duration: 0.4 });
                        }
                    }

                    if (activeEntries.length > 1) {
                        arrowLeft.classList.add('pulse');
                        arrowRight.classList.add('pulse');
                        setTimeout(() => {
                            arrowLeft.classList.remove('pulse');
                            arrowRight.classList.remove('pulse');
                        }, 2400);
                    }
                });
            });

            entries.forEach(({ category }) => {
                if (!markersByCategory[category]) markersByCategory[category] = [];
                if (!markersByCategory[category].includes(marker)) {
                    markersByCategory[category].push(marker);
                }
            });

            if (initialActive.length > 0) marker.addTo(map);
        });

        // Початковий список (Behörden за замовчуванням)
        const defaultCat = getActiveCategory();
        if (defaultCat) renderLocationList(defaultCat, allDataGlobal);
    })
    .catch(err => console.error("Fehler beim Laden der Daten:", err));

// ── Radio-фільтрація ──────────────────────────────────────────────
document.querySelectorAll('.category-filter').forEach(radio => {
    radio.addEventListener('change', () => {
        const activeCategory = getActiveCategory();

        const allMarkers = new Set(Object.values(markersByCategory).flat());

        allMarkers.forEach(marker => {
            const markerCategories = Object.entries(markersByCategory)
                .filter(([, markers]) => markers.includes(marker))
                .map(([cat]) => cat);

            if (markerCategories.includes(activeCategory)) {
                marker.setIcon(createIcon(activeCategory));
                marker.addTo(map);
            } else {
                marker.remove();
            }
        });

        // Оновлюємо відкритий попап
        if (currentState) {
            const activeEntries = getActiveEntries(currentState.allEntries);
            if (activeEntries.length === 0) {
                currentState.marker.closePopup();
            } else {
                currentState.activeEntries = activeEntries;
                currentState.index = 0;
                const { record, category } = activeEntries[0];
                const popupEl = currentState.marker.getPopup().getElement();
                const wrapper = popupEl && popupEl.querySelector('.leaflet-popup-content');
                if (wrapper) {
                    wrapper.innerHTML = buildCard(record, category, 0, activeEntries.length);
                }
                updateArrows();
            }
        }

        // Оновлюємо список установ
        if (allDataGlobal) renderLocationList(activeCategory, allDataGlobal);
    });
});

// Оновлюємо позицію списку при зміні розміру вікна
window.addEventListener('resize', () => {
    if (locationListEl.classList.contains('visible')) {
        positionLocationList();
    }
});

// ── Колір активної кнопки категорії ──────────────────────────────
function updateActiveFilterColor() {
    document.querySelectorAll('.category-filter').forEach(radio => {
        const tag   = radio.nextElementSibling;
        const color = (categoryConfig[radio.value] || {}).color;
        if (radio.checked && color) {
            tag.style.backgroundColor = color;
            tag.style.borderColor     = color;
            tag.style.color           = '#ffffff';
        } else {
            tag.style.backgroundColor = '';
            tag.style.borderColor     = '';
            tag.style.color           = '';
        }
    });
}

document.querySelectorAll('.category-filter').forEach(radio => {
    radio.addEventListener('change', updateActiveFilterColor);
});
updateActiveFilterColor();