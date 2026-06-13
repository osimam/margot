import { AppState } from '../store/appState.js';
import { PriceUtils, escapeHtml } from '../utils/priceUtils.js';
import { refreshIcons } from '../main.js';
import Chart from 'chart.js/auto';

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

export function initMarginsEvents() {
    const select = document.getElementById('margin-product-select');
    const btnModeA = document.getElementById('btn-mode-a');
    const btnModeB = document.getElementById('btn-mode-b');
    const btnModeC = document.getElementById('btn-mode-c'); // Nouveau
    
    const inputPrice = document.getElementById('input-price-ttc');
    const inputSlider = document.getElementById('input-marge-slider');
    const inputCoeff = document.getElementById('input-coeff'); // Nouveau
    const inputPertes = document.getElementById('input-pertes-slider'); // Nouveau

    if (select) select.addEventListener('change', loadMarginSimulation);
    if (btnModeA) btnModeA.addEventListener('click', () => switchMarginMode('A'));
    if (btnModeB) btnModeB.addEventListener('click', () => switchMarginMode('B'));
    if (btnModeC) btnModeC.addEventListener('click', () => switchMarginMode('C')); // Nouveau
    
    if (inputPrice) inputPrice.addEventListener('input', debounce(handlePriceInput, 150));
    if (inputSlider) inputSlider.addEventListener('input', debounce(handleSliderInput, 150));
    if (inputCoeff) inputCoeff.addEventListener('input', debounce(handleCoeffInput, 150)); // Nouveau
    if (inputPertes) inputPertes.addEventListener('input', handlePertesInput); // Nouveau (instantané pour le label)
    
    document.querySelectorAll('.tva-btn').forEach(btn => {
        btn.addEventListener('click', () => setSimTva(parseFloat(btn.dataset.tva)));
    });
}

export function populateMarginDropdown() {
    const select = document.getElementById('margin-product-select');
    if (!select) return;

    if (!AppState.products || AppState.products.length === 0) {
        select.innerHTML = `<option value="">-- Aucun produit --</option>`;
        const simBox = document.getElementById('simulation-box');
        if (simBox) simBox.classList.add('hidden'); 
        return;
    }

    select.innerHTML = AppState.products.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
    
    const lastProductHtmlId = localStorage.getItem('margot_last_sim_product_id');
    const savedProduct = AppState.products.find(x => x.id === lastProductHtmlId);
    
    AppState._selectedProduct = savedProduct ? savedProduct : AppState.products[0];
    select.value = AppState._selectedProduct.id;
    
    const simBox = document.getElementById('simulation-box');
    if (simBox) simBox.classList.remove('hidden');
    
    switchMarginMode(AppState.simMode || 'A'); 
    setSimTva(AppState.simTva || 10);
}

function loadMarginSimulation() {
    const select = document.getElementById('margin-product-select');
    if (!select) return;

    AppState._selectedProduct = AppState.products.find(x => x.id === select.value);
    if (!AppState._selectedProduct) return;
    
    localStorage.setItem('margot_last_sim_product_id', AppState._selectedProduct.id);

    const productId = AppState._selectedProduct.id;
    const costCents = AppState.getProductCostCents(AppState._selectedProduct);

    // --- RESTAURATION DES VALEURS MÉMORISÉES POUR CE PRODUIT ---
    
    // 1. Pertes mémorisées (Par défaut 0%)
    const savedPertes = JSON.parse(localStorage.getItem('margot_saved_product_pertes') || '{}');
    const currentPertes = savedPertes[productId] !== undefined ? savedPertes[productId] : 0;
    const inputPertes = document.getElementById('input-pertes-slider');
    if (inputPertes) inputPertes.value = currentPertes;
    const pertesValDisplay = document.getElementById('pertes-value');
    if (pertesValDisplay) pertesValDisplay.textContent = `${currentPertes}%`;

    // Calcul du coût ajusté avec pertes pour les pré-remplissages
    const costAjustedCents = Math.round(costCents * (1 + (currentPertes / 100)));

    // Mettre à jour l'affichage du coût brut sur l'interface
    const costDisplay = document.getElementById('sim-cost-display');
    if (costDisplay) costDisplay.textContent = `${PriceUtils.toEurosString(costCents)} €`;

    // 2. Slider Marge (Mode B) : Valeur mémorisée OU 70%
    const savedMargins = JSON.parse(localStorage.getItem('margot_saved_product_margins') || '{}');
    const currentProductMargin = savedMargins[productId] !== undefined ? savedMargins[productId] : 70;
    const inputSlider = document.getElementById('input-marge-slider');
    if (inputSlider) inputSlider.value = currentProductMargin;

    // 3. Coefficient (Mode C) : Valeur mémorisée OU 3.5 par défaut
    const savedCoeffs = JSON.parse(localStorage.getItem('margot_saved_product_coeffs') || '{}');
    const currentProductCoeff = savedCoeffs[productId] !== undefined ? savedCoeffs[productId] : 3.5;
    const inputCoeff = document.getElementById('input-coeff');
    if (inputCoeff) inputCoeff.value = currentProductCoeff;

    // 4. Prix TTC (Mode A) : Valeur mémorisée OU calculée sur la base de la marge par défaut
    const savedPrices = JSON.parse(localStorage.getItem('margot_saved_product_prices') || '{}');
    let currentProductPriceTTC = savedPrices[productId];
    if (currentProductPriceTTC === undefined) {
        const defaultPriceHtCents = Math.round(costAjustedCents / (1 - (currentProductMargin / 100)));
        const defaultPriceTtcCents = Math.round(defaultPriceHtCents * (1 + ((AppState.simTva || 10) / 100)));
        currentProductPriceTTC = PriceUtils.toEurosFloat(defaultPriceTtcCents).toFixed(2);
    }
    const inputPrice = document.getElementById('input-price-ttc');
    if (inputPrice) inputPrice.value = currentProductPriceTTC;

    // Lancement du calcul global
    executeActiveCalculation();
}

function executeActiveCalculation() {
    if (AppState.simMode === 'A') calculateOutputsModeA();
    else if (AppState.simMode === 'B') calculateOutputsModeB();
    else if (AppState.simMode === 'C') calculateOutputsModeC();
}

function handlePriceInput() {
    if (!AppState._selectedProduct) return;
    const inputPrice = document.getElementById('input-price-ttc');
    if (!inputPrice) return;

    const savedPrices = JSON.parse(localStorage.getItem('margot_saved_product_prices') || '{}');
    savedPrices[AppState._selectedProduct.id] = inputPrice.value;
    localStorage.setItem('margot_saved_product_prices', JSON.stringify(savedPrices));
    calculateOutputsModeA();
}

function handleSliderInput() {
    if (!AppState._selectedProduct) return;
    const inputSlider = document.getElementById('input-marge-slider');
    if (!inputSlider) return;

    const savedMargins = JSON.parse(localStorage.getItem('margot_saved_product_margins') || '{}');
    savedMargins[AppState._selectedProduct.id] = parseFloat(inputSlider.value);
    localStorage.setItem('margot_saved_product_margins', JSON.stringify(savedMargins));
    calculateOutputsModeB();
}

function handleCoeffInput() {
    if (!AppState._selectedProduct) return;
    const inputCoeff = document.getElementById('input-coeff');
    if (!inputCoeff) return;

    const savedCoeffs = JSON.parse(localStorage.getItem('margot_saved_product_coeffs') || '{}');
    savedCoeffs[AppState._selectedProduct.id] = parseFloat(inputCoeff.value) || 1;
    localStorage.setItem('margot_saved_product_coeffs', JSON.stringify(savedCoeffs));
    calculateOutputsModeC();
}

function handlePertesInput() {
    if (!AppState._selectedProduct) return;
    const inputPertes = document.getElementById('input-pertes-slider');
    if (!inputPertes) return;

    const percent = parseFloat(inputPertes.value);
    document.getElementById('pertes-value').textContent = `${percent}%`;

    const savedPertes = JSON.parse(localStorage.getItem('margot_saved_product_pertes') || '{}');
    savedPertes[AppState._selectedProduct.id] = percent;
    localStorage.setItem('margot_saved_product_pertes', JSON.stringify(savedPertes));
    
    // On recalcule immédiatement la vue active car le coût ajusté vient de bouger !
    executeActiveCalculation();
}

function switchMarginMode(mode) {
    AppState.simMode = mode; 
    localStorage.setItem('margot_sim_mode', mode);

    const btnA = document.getElementById('btn-mode-a');
    const btnB = document.getElementById('btn-mode-b');
    const btnC = document.getElementById('btn-mode-c');
    const inputsA = document.getElementById('inputs-mode-a');
    const inputsB = document.getElementById('inputs-mode-b');
    const inputsC = document.getElementById('inputs-mode-c');

    // Reset styles des boutons
    [btnA, btnB, btnC].forEach(b => {
        if(b) b.className = "py-2.5 text-xs font-bold rounded-lg text-slate-400 cursor-pointer px-4";
    });
    [inputsA, inputsB, inputsC].forEach(i => { if(i) i.classList.add('hidden'); });

    // Activation visuelle du mode sélectionné
    const activeBtn = document.getElementById(`btn-mode-${mode.toLowerCase()}`);
    const activeInputs = document.getElementById(`inputs-mode-${mode.toLowerCase()}`);
    
    if (activeBtn) activeBtn.className = "py-2.5 text-xs font-bold rounded-lg bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm cursor-pointer px-4";
    if (activeInputs) activeInputs.classList.remove('hidden');

    executeActiveCalculation();
}

function setSimTva(tvaValue) {
    AppState.simTva = tvaValue; 
    localStorage.setItem('margot_sim_tva', tvaValue.toString());

    document.querySelectorAll('.tva-btn').forEach(btn => {
        btn.className = parseFloat(btn.dataset.tva) === tvaValue 
            ? "tva-btn py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white cursor-pointer px-3" 
            : "tva-btn py-2 text-xs font-bold rounded-lg bg-slate-950 text-slate-400 border border-slate-800 cursor-pointer px-3";
    });
    executeActiveCalculation();
}

// OBTENIR LE COUT REEL PRENANT EN COMPTE LE CURSEUR DES PERTES
function getAjustedCostCents() {
    const costCents = AppState.getProductCostCents(AppState._selectedProduct);
    const inputPertes = document.getElementById('input-pertes-slider');
    const pertesPercent = inputPertes ? parseFloat(inputPertes.value) : 0;
    return Math.round(costCents * (1 + (pertesPercent / 100)));
}

// MODE A : Prix fixe TTC saisi au clavier
function calculateOutputsModeA() {
    if (!AppState._selectedProduct) return;
    
    const ajustedCostCents = getAjustedCostCents();
    const inputPrice = document.getElementById('input-price-ttc');
    const priceTtcCents = inputPrice ? PriceUtils.toCents(inputPrice.value || "0") : 0;
    
    const priceHtCents = Math.round(priceTtcCents / (1 + (AppState.simTva / 100)));
    const marginPercent = priceHtCents > 0 ? ((priceHtCents - ajustedCostCents) / priceHtCents) * 100 : 0;
    
    renderSimulationCard(priceTtcCents, priceHtCents, priceTtcCents - priceHtCents, ajustedCostCents, priceHtCents - ajustedCostCents, marginPercent);
}

// MODE B : Pourcentage de marge via Slider
function calculateOutputsModeB() {
    if (!AppState._selectedProduct) return;
    
    const ajustedCostCents = getAjustedCostCents();
    const inputSlider = document.getElementById('input-marge-slider');
    const target = inputSlider ? parseFloat(inputSlider.value) : 0;
    
    const sliderValDisplay = document.getElementById('slider-value');
    if (sliderValDisplay) sliderValDisplay.textContent = `${target}%`;
    
    const priceHtCents = target < 100 ? Math.round(ajustedCostCents / (1 - (target / 100))) : 0;
    const priceTtcCents = Math.round(priceHtCents * (1 + (AppState.simTva / 100)));

    renderSimulationCard(priceTtcCents, priceHtCents, priceTtcCents - priceHtCents, ajustedCostCents, priceHtCents - ajustedCostCents, target);
}

// NOUVEAU - MODE C : Multiplicateur de coefficient (Ex: Coût x 4)
function calculateOutputsModeC() {
    if (!AppState._selectedProduct) return;
    
    const ajustedCostCents = getAjustedCostCents();
    const inputCoeff = document.getElementById('input-coeff');
    const coeff = inputCoeff ? parseFloat(inputCoeff.value) || 1 : 1;
    
    const priceHtCents = Math.round(ajustedCostCents * coeff);
    const priceTtcCents = Math.round(priceHtCents * (1 + (AppState.simTva / 100)));
    const marginPercent = priceHtCents > 0 ? ((priceHtCents - ajustedCostCents) / priceHtCents) * 100 : 0;

    renderSimulationCard(priceTtcCents, priceHtCents, priceTtcCents - priceHtCents, ajustedCostCents, priceHtCents - ajustedCostCents, marginPercent);
}

function renderSimulationCard(ttcCents, htCents, tvaCents, costCents, marginCents, marginPercent) {
    const card = document.getElementById('result-card'); 
    if (!card) return;

    // --- 1. DÉFINITION DES PALIERS DE RENTABILITÉ (BADGES COULEUR) ---
    let badgeColor = "";
    let badgeText = "";
    let borderColor = "";
    let bgColor = "";

    if (marginPercent < 50) {
        badgeColor = "bg-rose-500/20 text-rose-400 border-rose-500/30";
        badgeText = "🔴 Danger (Seuil critique)";
        borderColor = "border-rose-500/20";
        bgColor = "bg-rose-500/5";
    } else if (marginPercent >= 50 && marginPercent < 70) {
        badgeColor = "bg-amber-500/20 text-amber-400 border-amber-500/30";
        badgeText = "🟡 Correct (Marge standard)";
        borderColor = "border-amber-500/20";
        bgColor = "bg-amber-500/5";
    } else {
        badgeColor = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
        badgeText = "🟢 Excellent (Marge idéale)";
        borderColor = "border-emerald-500/30";
        bgColor = "bg-emerald-500/5";
    }

    // --- 2. CALCUL DU SEUIL DE RENTABILITÉ EN VOLUME ---
    let seuilVolumeHtml = "";
    if (htCents > 0 && costCents > 0) {
        // Combien d'unités sur 100 vendues servent UNIQUEMENT à payer les ingrédients
        const unitesPourCout = Math.ceil((costCents / htCents) * 100);
        
        if (unitesPourCout <= 100) {
            seuilVolumeHtml = `
                <div class="mt-3 pt-3 border-t border-slate-800/60 text-[11px] text-slate-400 leading-relaxed">
                    <i data-lucide="info" class="w-3.5 h-3.5 inline text-amber-400 mr-1 align-middle"></i>
                    Sur 100 ventes, les <span class="font-bold font-mono text-slate-200">${unitesPourCout} premières</span> paient tes ingrédients. Tu gagnes de l'argent à partir de la <span class="font-bold font-mono text-emerald-400">${unitesPourCout + 1}e</span>.
                </div>
            `;
        } else {
            // Si le coût est supérieur au prix HT (Vente à perte)
            seuilVolumeHtml = `
                <div class="mt-3 pt-3 border-t border-slate-800/60 text-[11px] text-rose-400 font-medium">
                    <i data-lucide="alert-triangle" class="w-3.5 h-3.5 inline text-rose-400 mr-1 align-middle"></i>
                    Attention : Tu vends à perte ! Tu ne pourras jamais couvrir tes coûts.
                </div>
            `;
        }
    }

    // --- 3. INJECTION DU CODE HTML MIS À JOUR ---
    card.className = `p-5 rounded-2xl border ${borderColor} ${bgColor} space-y-3.5 transition-all duration-300`;
    
    card.innerHTML = `
        <div class="flex justify-between items-center border-b border-slate-800 pb-2.5">
            <span class="text-xs font-bold text-slate-400">Marge Brute générée :</span>
            <div class="flex flex-col items-end gap-1">
                <span class="text-2xl font-black font-mono text-slate-100">${marginPercent.toFixed(1)}%</span>
                <span class="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeColor}">
                    ${badgeText}
                </span>
            </div>
        </div>
        
        <div class="grid grid-cols-2 gap-3.5 text-xs pt-1">
            <div>
                <p class="text-[11px] text-slate-400 font-medium">Prix conseillé TTC :</p>
                <p class="text-lg font-black font-mono text-slate-100 mt-0.5">${PriceUtils.toEurosString(ttcCents)} €</p>
            </div>
            <div>
                <p class="text-[11px] text-slate-400 font-medium">Chiffre d'Affaires HT :</p>
                <p class="text-lg font-black font-mono text-slate-300 mt-0.5">${PriceUtils.toEurosString(htCents)} €</p>
            </div>
            <div>
                <p class="text-[11px] text-slate-400 font-medium">Gain net (Marge €) :</p>
                <p class="text-md font-bold font-mono text-emerald-400 mt-0.5">+ ${PriceUtils.toEurosString(marginCents)} €</p>
            </div>
            <div>
                <p class="text-[11px] text-slate-400 font-medium">TVA collectée :</p>
                <p class="text-md font-bold font-mono text-slate-500 mt-0.5">${PriceUtils.toEurosString(tvaCents)} €</p>
            </div>
        </div>

        ${seuilVolumeHtml}
    `;
    
    const cleanCost = PriceUtils.toEurosFloat(costCents);
    const cleanMargin = PriceUtils.toEurosFloat(marginCents < 0 ? 0 : marginCents);
    const cleanTva = PriceUtils.toEurosFloat(tvaCents < 0 ? 0 : tvaCents);

    updateMarginChart(cleanCost, cleanMargin, cleanTva);
    refreshIcons();
}

function updateMarginChart(cost, margin, tva) {
    const ctx = document.getElementById('marginChart'); 
    if (!ctx) return;
    
    try {
        if (AppState._marginChart && typeof AppState._marginChart.update === 'function') {
            AppState._marginChart.data.datasets[0].data = [cost, margin, tva]; 
            AppState._marginChart.update();
        } else {
            AppState._marginChart = new Chart(ctx, {
                type: 'doughnut',
                data: { 
                    labels: ['Coût d\'Achat Réel', 'Marge Brute', 'TVA'], 
                    datasets: [{ 
                        data: [cost, margin, tva], 
                        backgroundColor: ['#fbbf24', '#10b981', '#475569'], 
                        borderWidth: 0 
                    }] 
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false,
                    animation: { duration: 400 },
                    plugins: { 
                        legend: { 
                            position: 'bottom', 
                            labels: { color: '#94a3b8', font: { size: 10 } } 
                        } 
                    } 
                }
            });
        }
    } catch (e) {
        console.error("Erreur Chart.js :", e);
    }
}