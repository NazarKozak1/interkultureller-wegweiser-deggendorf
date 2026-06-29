const isMobile = () => window.innerWidth <= 768;

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

let currentSnap = 'peek';
let bsState = { entries: [], index: 0 };

function getSheetH() {
    return document.getElementById('bottom-sheet').offsetHeight;
}

function getPeekZoneH() {
    const el = document.getElementById('bottom-sheet-peek-zone');
    const handle = document.getElementById('bottom-sheet-handle');
    return (el ? el.offsetHeight : 0) + (handle ? handle.offsetHeight : 0);
}

function snapTo(snapName, animate = true) {
    const sheet = document.getElementById('bottom-sheet');
    currentSnap = snapName;

    const sheetH = getSheetH();
    let translateY;

    if (snapName === 'full') {
        translateY = 0;
    } else if (snapName === 'peek') {
        const peekH = getPeekZoneH();
        translateY = sheetH - peekH;
    } else {
        const handleEl  = document.getElementById('bottom-sheet-handle');
        const paginEl   = document.getElementById('bottom-sheet-pagination');
        const catEl     = document.querySelector('.bs-category-dot');
        const titleEl   = document.querySelector('.bs-title-preview');
        const addressEl = document.querySelector('.bs-address-preview');
        const paginH    = (paginEl && paginEl.style.display !== 'none') ? paginEl.offsetHeight : 0;
        const visibleH  = (handleEl  ? handleEl.offsetHeight  : 0)
                        + paginH
                        + (catEl     ? catEl.offsetHeight     : 0)
                        + (titleEl   ? titleEl.offsetHeight   : 0)
                        + (addressEl ? addressEl.offsetHeight : 0)
                        + 24;
        translateY = sheetH - visibleH;
    }

    sheet.style.transition = animate
        ? 'transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)'
        : 'none';
    sheet.style.transform = `translateY(${translateY}px)`;

    const content = document.getElementById('bottom-sheet-content');
    content.style.overflowY = snapName === 'full' ? 'auto' : 'hidden';
}

function openBottomSheet(activeEntries, marker) {
    if (!isMobile() || activeEntries.length === 0) return;

    bsState = { entries: activeEntries, index: 0 };
    renderBottomSheet();
    if (marker) setActiveMarker(marker, activeEntries[0].category);

    const sheet = document.getElementById('bottom-sheet');
    sheet.style.transition = 'none';
    sheet.style.transform = 'translateY(100%)';
    sheet.classList.add('open');

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            snapTo('peek', true);
        });
    });
}

function closeBottomSheet() {
    const sheet = document.getElementById('bottom-sheet');
    if (!sheet) return;
    sheet.style.transition = 'transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)';
    sheet.style.transform = 'translateY(100%)';
    setTimeout(() => sheet.classList.remove('open'), 320);
    clearActiveMarker();
    map.closePopup();
}

function initSheetDrag(sheet) {
    const handle   = document.getElementById('bottom-sheet-handle');
    const peekZone = document.getElementById('bottom-sheet-peek-zone');
    let startY = 0;
    let startTranslate = 0;
    let isDragging = false;

    function getCurrentTranslate() {
        const matrix = new DOMMatrix(window.getComputedStyle(sheet).transform);
        return matrix.m42;
    }

    function onTouchStart(e) {
        startY = e.touches[0].clientY;
        startTranslate = getCurrentTranslate();
        isDragging = true;
        sheet.style.transition = 'none';
    }

    function onTouchMove(e) {
        if (!isDragging) return;
        const dy = e.touches[0].clientY - startY;
        const newY = Math.max(0, startTranslate + dy);
        sheet.style.transform = `translateY(${newY}px)`;
    }

    function onTouchEnd() {
        if (!isDragging) return;
        isDragging = false;

        const currentY  = getCurrentTranslate();
        const sheetH    = getSheetH();
        const peekH     = getPeekZoneH();

        const fullY      = 0;
        const peekY      = sheetH - peekH;

        const handleEl2  = document.getElementById('bottom-sheet-handle');
        const paginEl2   = document.getElementById('bottom-sheet-pagination');
        const catEl2     = document.querySelector('.bs-category-dot');
        const titleEl2   = document.querySelector('.bs-title-preview');
        const addressEl2 = document.querySelector('.bs-address-preview');
        const paginH2    = (paginEl2 && paginEl2.style.display !== 'none') ? paginEl2.offsetHeight : 0;
        const visibleH2  = (handleEl2  ? handleEl2.offsetHeight  : 0)
                         + paginH2
                         + (catEl2     ? catEl2.offsetHeight     : 0)
                         + (titleEl2   ? titleEl2.offsetHeight   : 0)
                         + (addressEl2 ? addressEl2.offsetHeight : 0)
                         + 24;
        const collapsedY = sheetH - visibleH2;

        const distFull      = Math.abs(currentY - fullY);
        const distPeek      = Math.abs(currentY - peekY);
        const distCollapsed = Math.abs(currentY - collapsedY);

        if (distFull <= distPeek && distFull <= distCollapsed) {
            snapTo('full');
        } else if (distPeek <= distCollapsed) {
            snapTo('peek');
        } else {
            snapTo('collapsed');
        }
    }

    handle.addEventListener('touchstart',   onTouchStart, { passive: true });
    handle.addEventListener('touchmove',    onTouchMove,  { passive: true });
    handle.addEventListener('touchend',     onTouchEnd);
    peekZone.addEventListener('touchstart', onTouchStart, { passive: true });
    peekZone.addEventListener('touchmove',  onTouchMove,  { passive: true });
    peekZone.addEventListener('touchend',   onTouchEnd);

    peekZone.addEventListener('click', () => {
        if (currentSnap === 'collapsed') snapTo('peek');
    });
}

function renderBottomSheet() {
    const { entries, index } = bsState;
    const total = entries.length;
    const { record, category } = entries[index];
    const config = categoryConfig[category] || { color: '#555', emoji: '📍' };

    const description = record["Beschreibung"] || record["Beshreibung"] || "";
    const phone   = record["Telefonnummer"];
    const email   = record["E-Mail-Adresse"];
    const website = record["Website"];
    const hours   = formatHours(record);

    const peekZone = document.getElementById('bottom-sheet-peek-zone');
    let peekHtml = `
        <div class="bs-category-dot" style="background:${config.color}">${config.emoji} ${category}</div>
        <div class="bs-title-preview">${record["Name"]}</div>
        <p class="bs-address-preview">📍 ${record["Adresse"]}</p>
    `;
    if (description) peekHtml += `<p class="popup-desc">${description}</p>`;
    peekHtml += `<div class="popup-contacts">`;
    if (phone)   peekHtml += `<a href="tel:${phone}" class="popup-btn">📞 ${phone}</a>`;
    if (email)   peekHtml += `<a href="mailto:${email}" class="popup-btn">✉️ ${email}</a>`;
    if (website) peekHtml += `<a href="${website}" target="_blank" class="popup-btn popup-btn-web">🌐 Website</a>`;
    peekHtml += `</div>`;
    if (record["Deutschklasse"] === true) {
        peekHtml += `<div class="popup-badge">✅ Deutschklasse vorhanden</div>`;
    }
    peekZone.innerHTML = peekHtml;

    const pagination = document.getElementById('bottom-sheet-pagination');
    if (total > 1) {
        pagination.classList.remove('single');
        document.getElementById('bs-prev').disabled = index === 0;
        document.getElementById('bs-next').disabled = index === total - 1;
        document.getElementById('bs-counter').textContent = `${index + 1} / ${total}`;
    } else {
        pagination.classList.add('single');
    }

    let html = '';
    if (hours) html += `<div class="popup-section"><strong>Öffnungszeiten</strong>${hours}</div>`;
    document.getElementById('bottom-sheet-body').innerHTML = html;
}

function initBottomSheet() {
    const sheet = document.createElement('div');
    sheet.id = 'bottom-sheet';
    sheet.innerHTML = `
        <div id="bottom-sheet-handle"></div>
        <div id="bottom-sheet-pagination">
            <button class="bs-nav" id="bs-prev">◀</button>
            <span class="bs-counter" id="bs-counter">1 / 1</span>
            <button class="bs-nav" id="bs-next">▶</button>
            <button id="bottom-sheet-close">✕</button>
        </div>
        <div id="bottom-sheet-peek-zone"></div>
        <div id="bottom-sheet-content">
            <div id="bottom-sheet-body" class="popup-content"></div>
        </div>
    `;
    document.body.appendChild(sheet);

    document.getElementById('bottom-sheet-close').addEventListener('click', closeBottomSheet);

    document.getElementById('bs-prev').addEventListener('click', () => {
        if (bsState.index > 0) { bsState.index--; renderBottomSheet(); }
    });
    document.getElementById('bs-next').addEventListener('click', () => {
        if (bsState.index < bsState.entries.length - 1) { bsState.index++; renderBottomSheet(); }
    });

    initSheetDrag(sheet);
}

function attachMobileMarkerClick(marker, allEntries) {
    marker.on('click', (e) => {
        if (!isMobile()) return;
        e.originalEvent.stopPropagation();
        map.closePopup();

        const activeEntries = getActiveEntries(allEntries);
        if (activeEntries.length > 0) {
            openBottomSheet(activeEntries, marker);
        }
    });
}

initBottomSheet();
buildMobilePills();

window.addEventListener('resize', () => {
    if (!isMobile()) closeBottomSheet();
});

const filterRow = document.getElementById('mobile-filter-row');
if (filterRow) {
    L.DomEvent.disableScrollPropagation(filterRow);
    L.DomEvent.disableClickPropagation(filterRow);
    filterRow.addEventListener('touchstart', e => e.stopPropagation(), { passive: false });
    filterRow.addEventListener('touchmove',  e => e.stopPropagation(), { passive: false });
    filterRow.addEventListener('touchend',   e => e.stopPropagation(), { passive: false });
}