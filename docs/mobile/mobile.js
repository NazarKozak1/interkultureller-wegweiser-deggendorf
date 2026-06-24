// ── Мобільна адаптація ────────────────────────────────────────────

const isMobile = () => window.innerWidth <= 768;

// ── Пігулки фільтрів в хедері ─────────────────────────────────────

const mobilePillLabels = {
    "Behörden":                     "🏛️ Behörden",
    "Schulen und Hochschulen":      "🎓 Schulen",
    "Integrationskurse Deggendorf": "🗣️ Kurse",
    "Gesundheit":                   "🏥 Gesundheit",
    "Soziales":                     "🤝 Soziales",
    "Vereine und Gemeinschaft":     "🌍 Vereine"
};

function buildMobilePills() {
    const row = document.getElementById('mobile-filter-row');
    if (!row) return;
    row.innerHTML = '';

    Object.entries(mobilePillLabels).forEach(([value, label]) => {
        const pill = document.createElement('button');
        pill.className = 'mobile-pill';
        pill.textContent = label;
        pill.dataset.value = value;

        const color = (categoryConfig[value] || {}).color || '#1565c0';

        const radio = document.querySelector(`.category-filter[value="${value}"]`);
        if (radio && radio.checked) {
            pill.classList.add('active');
            pill.style.background = color;
        }

        pill.addEventListener('click', () => {
            const targetRadio = document.querySelector(`.category-filter[value="${value}"]`);
            if (targetRadio) {
                targetRadio.checked = true;
                targetRadio.dispatchEvent(new Event('change', { bubbles: true }));
            }

            row.querySelectorAll('.mobile-pill').forEach(p => {
                p.classList.remove('active');
                p.style.background = '';
            });
            pill.classList.add('active');
            pill.style.background = color;

            closeBottomSheet();
        });

        row.appendChild(pill);
    });
}

// ── Bottom Sheet ──────────────────────────────────────────────────

let bsState = { entries: [], index: 0 };
let sheetOpenedOnce = false;

function openBottomSheet(activeEntries, markerLatLng) {
    if (!isMobile() || activeEntries.length === 0) return;

    bsState = { entries: activeEntries, index: 0 };
    renderBottomSheet();

    const sheet = document.getElementById('bottom-sheet');
    sheet.classList.add('open');

    // Панорамуємо тільки при першому відкритті sheet
    if (!sheetOpenedOnce) {
        sheetOpenedOnce = true;
        requestAnimationFrame(() => {
            const sheetH      = sheet.offsetHeight;
            const mapH        = document.getElementById('map').offsetHeight;
            const padding     = 60;

            if (markerLatLng) {
                const markerPx    = map.latLngToContainerPoint(markerLatLng);
                const visibleMapH = mapH - sheetH;

                if (markerPx.y > visibleMapH - padding) {
                    const offset = markerPx.y - (visibleMapH - padding);
                    map.panBy([0, offset], { animate: true, duration: 0.3 });
                }
            }
        });
    }
}

function closeBottomSheet() {
    const sheet = document.getElementById('bottom-sheet');
    if (sheet) sheet.classList.remove('open');
    sheetOpenedOnce = false; // скидаємо при закритті
    map.closePopup();
}

function renderBottomSheet() {
    const { entries, index } = bsState;
    const total = entries.length;
    const { record, category } = entries[index];
    const config = categoryConfig[category] || { color: '#555', emoji: '📍' };

    const pagination = document.getElementById('bottom-sheet-pagination');
    if (total > 1) {
        pagination.style.display = 'flex';
        document.getElementById('bs-prev').disabled = index === 0;
        document.getElementById('bs-next').disabled = index === total - 1;
        document.getElementById('bs-counter').textContent = `${index + 1} / ${total}`;
    } else {
        pagination.style.display = 'none';
    }

    const description = record["Beschreibung"] || record["Beshreibung"] || "";
    const phone   = record["Telefonnummer"];
    const email   = record["E-Mail-Adresse"];
    const website = record["Website"];
    const hours   = formatHours(record);

    let html = '';

    html += `<div class="popup-category" style="background:${config.color}">${config.emoji} ${category}</div>`;
    html += `<h3 class="popup-title">${record["Name"]}</h3>`;
    html += `<p class="popup-address">📍 ${record["Adresse"]}</p>`;

    if (description) html += `<p class="popup-desc">${description}</p>`;
    if (hours) html += `<div class="popup-section"><strong>Öffnungszeiten</strong>${hours}</div>`;

    html += `<div class="popup-contacts">`;
    if (phone)   html += `<a href="tel:${phone}" class="popup-btn">📞 ${phone}</a>`;
    if (email)   html += `<a href="mailto:${email}" class="popup-btn">✉️ ${email}</a>`;
    if (website) html += `<a href="${website}" target="_blank" class="popup-btn popup-btn-web">🌐 Website</a>`;
    html += `</div>`;

    if (record["Deutschklasse"] === true) {
        html += `<div class="popup-badge">✅ Deutschklasse vorhanden</div>`;
    }

    document.getElementById('bottom-sheet-body').innerHTML = html;
}

// ── Ініціалізація DOM bottom sheet ────────────────────────────────

function initBottomSheet() {
    const sheet = document.createElement('div');
    sheet.id = 'bottom-sheet';
    sheet.innerHTML = `
        <div id="bottom-sheet-handle"></div>
        <button id="bottom-sheet-close">✕</button>
        <div id="bottom-sheet-pagination">
            <button class="bs-nav" id="bs-prev">◀</button>
            <span class="bs-counter" id="bs-counter">1 / 1</span>
            <button class="bs-nav" id="bs-next">▶</button>
        </div>
        <div id="bottom-sheet-content">
            <div id="bottom-sheet-body" class="popup-content"></div>
        </div>
    `;
    document.body.appendChild(sheet);

    document.getElementById('bottom-sheet-close').addEventListener('click', closeBottomSheet);

    document.getElementById('bs-prev').addEventListener('click', () => {
        if (bsState.index > 0) {
            bsState.index--;
            renderBottomSheet();
        }
    });

    document.getElementById('bs-next').addEventListener('click', () => {
        if (bsState.index < bsState.entries.length - 1) {
            bsState.index++;
            renderBottomSheet();
        }
    });
}

// ── Перехоплюємо кліки на маркери на мобільному ───────────────────

function attachMobileMarkerClick(marker, allEntries) {
    marker.on('click', (e) => {
        if (!isMobile()) return;
        e.originalEvent.stopPropagation();
        map.closePopup();

        const activeEntries = getActiveEntries(allEntries);
        if (activeEntries.length > 0) {
            openBottomSheet(activeEntries, marker.getLatLng());
        }
    });
}

// ── Запуск ────────────────────────────────────────────────────────

initBottomSheet();
buildMobilePills();

window.addEventListener('resize', () => {
    if (!isMobile()) closeBottomSheet();
});