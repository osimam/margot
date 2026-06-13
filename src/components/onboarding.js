import { AppState } from '../store/appState.js';

// Fonction de nettoyage HTML intégrée pour éviter les erreurs d'importation de prixUtils
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
}

// Helper pour appeler les fonctions de main.js sans import circulaire
function callGlobal(funcName, ...args) {
    if (window[funcName] && typeof window[funcName] === 'function') {
        window[funcName](...args);
    } else {
        console.warn(`La fonction globale ${funcName} n'est pas encore disponible.`);
    }
}

export const CATALOG_DATA = Object.freeze({
    boulangerie: {
        products: [
            { name: "Pain de Tradition / Baguette", icon: "bread" },
            { name: "Viennoiseries (Croissant, Pain au chocolat)", icon: "croissant" },
            { name: "Pâtisseries individuelles (Éclairs, Tartes)", icon: "cake" },
            { name: "Pains spéciaux (Complet, Seigle)", icon: "wheat" },
            { name: "Snacking (Sandwichs, Quiches)", icon: "sandwich" }
        ],
        ingredients: [{ name: "Farine de Tradition T55", unit: "kg" }, { name: "Beurre de Tournage AOP", unit: "kg" }, { name: "Sucre Semoule", unit: "kg" }, { name: "Levure Boulangère", unit: "kg" }, { name: "Œufs de Plein Air", unit: "u" }, { name: "Lait Entier", unit: "L" }, { name: "Chocolat (Bâtonnets)", unit: "u" }]
    },
    boucherie: {
        products: [
            { name: "Viande Bovine (Pièces / Steak)", icon: "beef" },
            { name: "Volailles & Dérivés", icon: "drumstick" },
            { name: "Charcuterie Artisanale (Pâté, Jambon)", icon: "meat" },
            { name: "Plats Cuisinés Traiteur", icon: "chef" },
            { name: "Saucisserie / Grillades", icon: "flame" }
        ],
        ingredients: [{ name: "Carcasse / Pièce de Bœuf", unit: "kg" }, { name: "Poitrine / Épaule de Porc", unit: "kg" }, { name: "Filet de Poulet", unit: "kg" }, { name: "Boyaux Naturels", unit: "u" }, { name: "Sel de salaison nitrité", unit: "kg" }, { name: "Mélange d'Épices Traiteur", unit: "kg" }, { name: "Crème Fraîche Liquide", unit: "L" }]
    },
    restauration: {
        products: [
            { name: "Burgers / Tacos", icon: "burger" },
            { name: "Pizzas Artisanales", icon: "pizza" },
            { name: "Salades composées", icon: "salad" },
            { name: "Frites & Accompagnements", icon: "fries" },
            { name: "Desserts Maison", icon: "cookie" }
        ],
        ingredients: [{ name: "Pâtons à Pizza", unit: "u" }, { name: "Pain Burger (Bun)", unit: "u" }, { name: "Mozzarella fior di latte", unit: "kg" }, { name: "Steak Haché Frais 15% mg", unit: "kg" }, { name: "Huile de friture", unit: "L" }, { name: "Sauce Tomate cuisinée", unit: "kg" }, { name: "Frites fraîches", unit: "kg" }]
    },
    chocolaterie: {
        products: [
            { name: "Bonbons de Chocolat", icon: "candy" },
            { name: "Tablettes d'Origine", icon: "bar" },
            { name: "Mendiants & Fruits Enrobés", icon: "nuts" }
        ],
        ingredients: [{ name: "Chocolat de Couverture Noir", unit: "kg" }, { name: "Chocolat de Couverture Lait", unit: "kg" }, { name: "Beurre de Cacao", unit: "kg" }, { name: "Crème Liquide", unit: "L" }, { name: "Sucre Semoule", unit: "kg" }]
    },
    glacier: {
        products: [
            { name: "Glaces Crèmeuses", icon: "ice-cream" },
            { name: "Sorbets Plein Fruit", icon: "citrus" },
            { name: "Bacs à emporter", icon: "box" }
        ],
        ingredients: [{ name: "Lait Entier", unit: "L" }, { name: "Crème Fraîche", unit: "L" }, { name: "Lait Écrémé en Poudre", unit: "kg" }, { name: "Sucre Semoule", unit: "kg" }]
    },
    fromagerie: {
        products: [
            { name: "Pâtes Pressées Cuites", icon: "cheese" },
            { name: "Chèvres & Brebis Fermiers", icon: "milk" },
            { name: "Plateaux de Fromages", icon: "layers" }
        ],
        ingredients: [{ name: "Lait Cru de Vache", unit: "L" }, { name: "Lait de Chèvre", unit: "L" }, { name: "Présure Liquide", unit: "L" }, { name: "Ferments Lactiques", unit: "g" }, { name: "Sel de Mer", unit: "kg" }]
    }
});

const SWIPE_JOB_META = Object.freeze({
    boulangerie: { icon: "croissant", label: "Boulangerie Pâtisserie" },
    boucherie: { icon: "beef", label: "Boucherie Charcuterie" },
    restauration: { icon: "pizza", label: "Restauration / Food-Truck" },
    chocolaterie: { icon: "candy", label: "Chocolaterie Confiserie" },
    glacier: { icon: "ice-cream", label: "Glacier Artisanal" },
    fromagerie: { icon: "cheese", label: "Fromagerie Crèmerie" }
});

export function initOnboarding() {
    document.getElementById('btn-finalize-onboarding')?.addEventListener('click', finalizeOnboarding);
    document.getElementById('btn-go-products')?.addEventListener('click', () => showOnboardingStep(2));
    document.getElementById('btn-go-ingredients')?.addEventListener('click', () => showOnboardingStep(3));
    document.getElementById('btn-back-to-commerce')?.addEventListener('click', () => showOnboardingStep(1));
    document.getElementById('btn-back-to-products')?.addEventListener('click', () => showOnboardingStep(2));
    document.getElementById('btn-add-custom-product')?.addEventListener('click', addOnboardCustomProduct);
    document.getElementById('btn-add-custom-ingredient')?.addEventListener('click', addOnboardCustomIngredient);
}

export function initSwipeCommerce() {
    const container = document.getElementById('swipe-container');
    const dotsContainer = document.getElementById('swipe-dots');
    if (!container || !dotsContainer) return;

    const fragmentCards = document.createDocumentFragment();
    const fragmentDots = document.createDocumentFragment();
    const jobs = Object.keys(CATALOG_DATA);

    const svgIcons = {
        boulangerie: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-7 h-7"><path d="m5 11 4-7 4 7H5Z"/><path d="M17.5 15.5c.8 0 1.5-.7 1.5-1.5s-.7-1.5-1.5-1.5-1.5.7-1.5 1.5.7 1.5 1.5 1.5Z"/><path d="M12 20c3.3 0 6-2.7 6-6H6c0 3.3 2.7 6 6 6Z"/></svg>`,
        boucherie: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-7 h-7"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"/></svg>`,
        restauration: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-7 h-7"><path d="M15 11h6a2 2 0 0 1 2 2v2a4 4 0 0 1-4 4v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-2a4 4 0 0 1-4-4v-2a2 2 0 0 1 2-2Z"/><path d="M5 2h4a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z"/><path d="M19 11V7a5 5 0 0 0-10 0v4"/></svg>`,
        chocolaterie: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-7 h-7"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>`,
        glacier: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-7 h-7"><path d="m7 11 5 11 5-11H7Z"/><path d="M12 11a4 4 0 0 0 4-4c0-2.5-2-4-4-4s-4 1.5-4 4a4 4 0 0 0 4 4Z"/></svg>`,
        fromagerie: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-7 h-7"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z"/><path d="M12 6v6l4 2"/></svg>`
    };

    jobs.forEach((jobId, idx) => {
        const meta = SWIPE_JOB_META[jobId];
        const card = document.createElement('div');
        card.className = "swipe-card min-w-[82%] bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-6 rounded-2xl snap-center flex flex-col items-center justify-center text-center gap-4 cursor-pointer select-none py-8 my-1 transition-all duration-300 shadow-xl relative overflow-hidden";
        card.dataset.jobId = jobId;

        card.innerHTML = `
            <div class="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none"></div>
            <div class="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400 shadow-inner icon-box transition-all duration-300">
                ${svgIcons[jobId]}
            </div>
            <div class="space-y-1">
                <h3 class="font-black text-xs text-slate-200 tracking-wide">${meta.label}</h3>
                <p class="text-[10px] text-slate-400 font-medium px-2">Inclut fiches techniques et ingrédients adaptés à votre quotidien.</p>
            </div>
        `;
        card.addEventListener('click', () => {
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            handleJobSelect(jobId);
        });
        fragmentCards.appendChild(card);

        const dot = document.createElement('div');
        dot.className = `h-1.5 rounded-full bg-slate-800 transition-all duration-300 ${idx === 0 ? 'bg-emerald-500 w-4' : 'w-1.5'}`;
        dot.dataset.idx = idx;
        fragmentDots.appendChild(dot);
    });

    container.replaceChildren(fragmentCards);
    dotsContainer.replaceChildren(fragmentDots);

    let scrollTimeout;
    container.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            const containerCenter = container.scrollLeft + (container.offsetWidth / 2);
            let closestCard = null;
            let minDistance = Infinity;

            container.querySelectorAll('.swipe-card').forEach(card => {
                const cardCenter = card.offsetLeft + (card.offsetWidth / 2);
                const distance = Math.abs(containerCenter - cardCenter);
                if (distance < minDistance) { minDistance = distance; closestCard = card; }
            });

            if (closestCard) {
                container.querySelectorAll('.swipe-card').forEach(c => c.classList.remove('active'));
                closestCard.classList.add('active');
                const cardsArray = Array.from(container.querySelectorAll('.swipe-card'));
                const activeIdx = cardsArray.indexOf(closestCard);

                dotsContainer.querySelectorAll('div').forEach((dot, dIdx) => {
                    dot.className = dIdx === activeIdx ? "h-1.5 rounded-full bg-emerald-500 w-4 transition-all duration-300" : "h-1.5 rounded-full bg-slate-800 w-1.5 transition-all duration-300";
                });

                handleJobSelect(closestCard.dataset.jobId);
            }
        }, 40);
    });

    const firstCard = container.querySelector('.swipe-card');
    if (firstCard) firstCard.classList.add('active');
    handleJobSelect(jobs[0]);
}

function handleJobSelect(jobId) {
    if (AppState.onboardSelectedJobId === jobId) return;
    AppState.onboardSelectedJobId = jobId;
    AppState.onboardCustomProducts = [];
    AppState.onboardCustomIngredients = [];
    document.getElementById('onboard-custom-products-tags')?.replaceChildren();
    document.getElementById('onboard-custom-ingredients-tags')?.replaceChildren();
}

export function showOnboardingStep(step) {
    const subtitle = document.getElementById('onboarding-step-subtitle');
    const boxCommerce = document.getElementById('step-box-commerce');
    const boxProducts = document.getElementById('step-box-products');
    const boxIngredients = document.getElementById('step-box-ingredients');

    if (!boxCommerce || !boxProducts || !boxIngredients) return;

    boxCommerce.classList.add('hidden'); 
    boxProducts.classList.add('hidden'); 
    boxIngredients.classList.add('hidden');

    if (step === 1) {
        if (subtitle) subtitle.textContent = "Étape 1 : Choisissez votre univers métier"; 
        boxCommerce.classList.remove('hidden');
    } else if (step === 2) {
        if (subtitle) subtitle.textContent = "Étape 2 : Cochez vos produits de vente"; 
        boxProducts.classList.remove('hidden'); 
        renderOnboardProductsList();
    } else if (step === 3) {
        if (subtitle) subtitle.textContent = "Étape 3 : Validez vos matières premières clés"; 
        boxIngredients.classList.remove('hidden'); 
        renderOnboardIngredientsList();
    }
    callGlobal('refreshIcons');
}

function renderOnboardProductsList() {
    const list = document.getElementById('products-checkbox-list');
    if (!list) return;
    
    const productSvgs = {
        bread: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m11 11-4-7-4 7h8Z"/><path d="M12 20c3.3 0 6-2.7 6-6H6c0 3.3 2.7 6 6 6Z"/></svg>`,
        croissant: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 8 4 4 4-4H5Z"/></svg>`,
        cake: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/></svg>`,
        wheat: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 22 22 2"/></svg>`,
        sandwich: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11h18v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3Z"/></svg>`
    };

    const currentJobProducts = CATALOG_DATA[AppState.onboardSelectedJobId]?.products || [];

    list.className = "grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1 text-xs";
    list.innerHTML = currentJobProducts.map(p => {
        const iconHtml = productSvgs[p.icon] || `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`;
        return `
            <label class="product-card flex items-center justify-between bg-slate-950/60 border border-slate-800 p-3 rounded-xl cursor-pointer hover:border-slate-700/80 transition-all duration-200 group">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="product-icon-box w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center shrink-0">
                        ${iconHtml}
                    </div>
                    <span class="text-slate-200 font-semibold truncate pr-2">${escapeHtml(p.name)}</span>
                </div>
                <div class="flex items-center">
                    <input type="checkbox" 
                           data-type="default" 
                           value="${escapeHtml(p.name)}" 
                           data-name="${escapeHtml(p.name)}" 
                           data-icon="${p.icon || 'shopping-bag'}" 
                           checked 
                           class="custom-checkbox w-4 h-4 text-emerald-600 focus:ring-emerald-500/30 bg-slate-900 border-slate-700 rounded-md transition cursor-pointer">
                </div>
            </label>
        `;
    }).join('');
}

function renderOnboardIngredientsList() {
    const list = document.getElementById('ingredients-checkbox-list');
    if (!list) return;
    
    const currentJobIngredients = CATALOG_DATA[AppState.onboardSelectedJobId]?.ingredients || [];

    const unitMeta = {
        'kg': { label: 'Poids (kg)', bg: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
        'g':  { label: 'Poids (g)',  bg: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' },
        'L':  { label: 'Volume (L)', bg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' },
        'u':  { label: 'Unité (u)',  bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400' }
    };

    list.className = "grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1 text-xs";
    list.innerHTML = currentJobIngredients.map(ing => {
        const meta = unitMeta[ing.unit] || { label: ing.unit, bg: 'bg-slate-800 border-slate-700 text-slate-400' };
        
        return `
            <label class="ingredient-card flex items-center justify-between bg-slate-950/60 border border-slate-800 p-3 rounded-xl cursor-pointer hover:border-slate-700/80 transition-all duration-200 group">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-9 h-7 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center border shrink-0 ${meta.bg}">
                        ${ing.unit}
                    </div>
                    <div class="flex flex-col min-w-0">
                        <span class="text-slate-200 font-semibold truncate pr-2">${escapeHtml(ing.name)}</span>
                        <span class="text-[9px] text-slate-500 font-medium tracking-wide">${meta.label}</span>
                    </div>
                </div>
                <div class="flex items-center">
                    <input type="checkbox" data-type="default" value="${escapeHtml(ing.name)}" data-unit="${ing.unit}" checked class="custom-checkbox w-4 h-4 text-emerald-600 focus:ring-emerald-500/30 bg-slate-900 border-slate-700 rounded-md transition cursor-pointer">
                </div>
            </label>
        `;
    }).join('');
}

function addOnboardCustomProduct() {
    const input = document.getElementById('onboard-custom-product-input');
    if (!input) return;
    const val = input.value.trim();
    if (!val || AppState.onboardCustomProducts.includes(val)) { input.value = ""; return; }
    AppState.onboardCustomProducts.push(val); input.value = "";
    const tag = document.createElement('div');
    tag.className = "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5";
    tag.innerHTML = `<span>${escapeHtml(val)}</span><i class="cursor-pointer font-bold style-none">✕</i>`;
    tag.querySelector('i').addEventListener('click', () => { AppState.onboardCustomProducts = AppState.onboardCustomProducts.filter(x => x !== val); tag.remove(); });
    document.getElementById('onboard-custom-products-tags')?.appendChild(tag);
}

function addOnboardCustomIngredient() {
    const nameIn = document.getElementById('onboard-custom-ing-name');
    const unitIn = document.getElementById('onboard-custom-ing-unit');
    if (!nameIn || !unitIn) return;
    const name = nameIn.value.trim(); if (!name) return;
    AppState.onboardCustomIngredients.push({ name, unit: unitIn.value }); nameIn.value = "";
    const tag = document.createElement('div');
    tag.className = "bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5";
    tag.innerHTML = `<span>${escapeHtml(name)} (${unitIn.value})</span><i class="cursor-pointer font-bold style-none">✕</i>`;
    tag.querySelector('i').addEventListener('click', () => { AppState.onboardCustomIngredients = AppState.onboardCustomIngredients.filter(x => x.name !== name); tag.remove(); });
    document.getElementById('onboard-custom-ingredients-tags')?.appendChild(tag);
}

function finalizeOnboarding() {
    if (!AppState.onboardSelectedJobId) {
        callGlobal('showToast', 'Veuillez sélectionner un univers métier');
        showOnboardingStep(1);
        return;
    }

    try {
        const productCheckboxes = document.querySelectorAll('#products-checkbox-list input[type="checkbox"]:checked');
        const defaultProducts = Array.from(productCheckboxes).map(cb => {
            return {
                id: 'p_' + Math.random().toString(36).substr(2, 9),
                name: cb.value,
                icon: cb.dataset.icon || 'shopping-bag',
                ingredients: [], 
                sellingPrice: 0,
                tva: 10
            };
        });

        const customProducts = (AppState.onboardCustomProducts || []).map(name => ({
            id: 'p_' + Math.random().toString(36).substr(2, 9),
            name: name,
            icon: 'sparkles', 
            ingredients: [],
            sellingPrice: 0,
            tva: 10
        }));

        AppState.products = [...defaultProducts, ...customProducts];

        const ingredientCheckboxes = document.querySelectorAll('#ingredients-checkbox-list input[type="checkbox"]:checked');
        const defaultIngredients = Array.from(ingredientCheckboxes).map(cb => {
            return {
                id: 'i_' + Math.random().toString(36).substr(2, 9),
                name: cb.value,
                price: 0, 
                qty: 1,
                unit: cb.dataset.unit || 'kg'
            };
        });

        const customIngredients = (AppState.onboardCustomIngredients || []).map(ing => ({
            id: 'i_' + Math.random().toString(36).substr(2, 9),
            name: ing.name,
            price: 0,
            qty: 1,
            unit: ing.unit || 'kg'
        }));

        AppState.ingredients = [...defaultIngredients, ...customIngredients];

        localStorage.setItem('margot_ingredients', JSON.stringify(AppState.ingredients));
        localStorage.setItem('margot_products', JSON.stringify(AppState.products));

    } catch (error) {
        console.error("Erreur lors de la récupération du catalogue :", error);
    }

    AppState.setProfileConfigured(true);

    const appNav = document.getElementById('app-nav');
    if (appNav) appNav.classList.remove('hidden');

    // Résolution de la boucle circulaire via les fonctions partagées sur l'objet window
    callGlobal('switchScreen', 'products');
    callGlobal('showToast', 'Votre espace Margot est prêt !');
}