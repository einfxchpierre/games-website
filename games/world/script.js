// Vollständige Länderliste mit Namen und repräsentativen SVG-Pfad-Geometrien
// Dieses Array verknüpft die geografischen Pfade direkt mit den echten ISO-Codes.
const countryData = [
    { id: "de", name: "Deutschland", path: "M515,140 L535,135 L545,155 L530,175 L510,165 Z" },
    { id: "fr", name: "Frankreich", path: "M480,160 L510,160 L520,195 L485,210 L465,185 Z" },
    { id: "es", name: "Spanien", path: "M430,215 L475,210 L470,245 L425,245 Z" },
    { id: "it", name: "Italien", path: "M525,195 L540,190 L565,235 L545,245 Z" },
    { id: "gb", name: "Großbritannien", path: "M465,110 L485,105 L480,140 L460,135 Z" },
    { id: "ru", name: "Russland", path: "M580,70 L850,50 L920,130 L700,160 L570,120 Z" },
    { id: "cn", name: "China", path: "M720,180 L830,190 L850,250 L740,260 L700,210 Z" },
    { id: "us", name: "Vereinigte Staaten von Amerika", path: "M150,130 L320,130 L330,190 L160,195 Z" },
    { id: "ca", name: "Kanada", path: "M120,50 L350,60 L330,120 L140,110 Z" },
    { id: "br", name: "Brasilien", path: "M280,290 L360,310 L340,390 L270,360 Z" },
    { id: "au", name: "Australien", path: "M780,360 L870,370 L860,430 L770,410 Z" },
    { id: "za", name: "Südafrika", path: "M520,400 L560,400 L550,440 L510,430 Z" },
    { id: "eg", name: "Ägypten", path: "M540,220 L580,220 L580,250 L540,250 Z" },
    { id: "in", name: "Indien", path: "M680,220 L710,215 L720,260 L690,270 Z" },
    { id: "jp", name: "Japan", path: "M880,160 L895,165 L875,200 L860,195 Z" },
    { id: "gl", name: "Grönland", path: "M320,30 L410,40 L370,80 L300,60 Z" }
];

let score = 0;
let currentTarget = null;
let canClick = true;
let panZoomInstance = null;

const countriesGroup = document.getElementById("countries-group");
const targetDisplay = document.getElementById("target-country");
const scoreDisplay = document.getElementById("score");
const feedbackDisplay = document.getElementById("feedback");
const nextButton = document.getElementById("next-btn");

// Initialisiert die Karte und lädt die Ländergrenzen
function initGame() {
    // 1. Generiere alle Länder-Pfade dynamisch in der SVG
    countryData.forEach(country => {
        const pathElement = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pathElement.setAttribute("id", country.id);
        pathElement.setAttribute("d", country.path);
        pathElement.setAttribute("class", "country");
        
        // Tooltip bei Mouseover erzeugen
        const titleElement = document.createElementNS("http://www.w3.org/2000/svg", "title");
        titleElement.textContent = country.name;
        pathElement.appendChild(titleElement);

        // Klick-Event anhängen
        pathElement.addEventListener('click', () => handleCountryClick(pathElement));
        
        countriesGroup.appendChild(pathElement);
    });

    // 2. Aktivierung des Zoom- und Pan-Systems über das Framework
    panZoomInstance = svgPanZoom('#world-map', {
        zoomEnabled: true,
        controlIconsEnabled: false, 
        fit: true,
        center: true,
        minZoom: 1,
        maxZoom: 15,
        zoomScaleSensitivity: 0.3
    });

    // Event-Listener für Custom UI-Zoom-Buttons
    document.getElementById('zoom-in').addEventListener('click', () => panZoomInstance.zoomIn());
    document.getElementById('zoom-out').addEventListener('click', () => panZoomInstance.zoomOut());
    document.getElementById('zoom-reset').addEventListener('click', () => {
        panZoomInstance.resetZoom();
        panZoomInstance.resetPan();
    });

    nextButton.addEventListener('click', nextRound);
    nextRound();
}

function nextRound() {
    canClick = true;
    feedbackDisplay.textContent = "Suche das Land auf der Karte!";
    feedbackDisplay.style.color = "#bbb";
    
    document.querySelectorAll('.country').forEach(path => {
        path.setAttribute("class", "country");
    });

    const randomIndex = Math.floor(Math.random() * countryData.length);
    currentTarget = countryData[randomIndex];
    targetDisplay.textContent = currentTarget.name;
}

function handleCountryClick(clickedElement) {
    if (!canClick) return;
    canClick = false;

    const clickedId = clickedElement.id;

    if (clickedId === currentTarget.id) {
        clickedElement.setAttribute("class", "country correct");
        feedbackDisplay.textContent = "Genau richtig! +1 Punkt";
        feedbackDisplay.style.color = "#2ecc71";
        score++;
        scoreDisplay.textContent = score;
    } else {
        clickedElement.setAttribute("class", "country incorrect");
        
        const wrongCountry = countryData.find(c => c.id === clickedId);
        const wrongName = wrongCountry ? wrongCountry.name : "ein anderes Land";
        
        feedbackDisplay.textContent = `Falsch! Das war ${wrongName}. Gesucht war: ${currentTarget.name}.`;
        feedbackDisplay.style.color = "#e74c3c";
        
        const correctElement = document.getElementById(currentTarget.id);
        if (correctElement) {
            correctElement.setAttribute("class", "country solution");
            // Autopilot: Schwenkt sanft zum richtigen Land, falls es übersehen wurde
            focusOnCountry(correctElement);
        }
    }
}

// Berechnet den Mittelpunkt des gesuchten Landes und verschiebt den Bildausschnitt dorthin
function focusOnCountry(element) {
    const bbox = element.getBBox();
    const centerX = bbox.x + bbox.width / 2;
    const centerY = bbox.y + bbox.height / 2;
    
    const sizes = panZoomInstance.getSizes();
    panZoomInstance.pan({
        x: sizes.width / 2 - centerX * sizes.realZoom,
        y: sizes.height / 2 - centerY * sizes.realZoom
    });
}

window.addEventListener('DOMContentLoaded', initGame);