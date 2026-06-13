// Correction de la casse de l'import (pour correspondre à l'utilisation plus bas)
import { AppState } from './store/appState.js'; 
import { initOnboarding, initSwipeCommerce, showOnboardingStep } from './components/onboarding.js';
import { renderIngredients, initIngredientsEvents } from './components/ingredients.js';
import { renderProducts, initProductsEvents } from './components/products.js';
import { populateMarginDropdown, initMarginsEvents } from './components/margins.js';
import { populatePlannerInputs, initPlannerEvents } from './components/planner.js';

// --- CONSTANTES GLOBALES DE CONFIGURATION ---
const LOCAL_STORAGE_KEYS = {
    ingredients: 'margot_ingredients', // Synchronisé avec onboarding.js
    products: 'margot_products'        // Synchronisé avec onboarding.js
};

let _lucidePending = false;
export function refreshIcons() {
    if (_lucidePending) return;
    _lucidePending = true;
    
    requestAnimationFrame(() => {
        try {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            } else {
                console.warn("Lucide n'est pas encore chargé sur la page.");
            }
        } catch (error) {
            console.warn("Erreur d'initialisation des icônes :", error);
        }
        _lucidePending = false;
    });
}

// Système de Toast global
let _toastTimer = null;
export function showToast(msg = 'Enregistré') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    const msgEl = document.getElementById('toast-msg');
    if (msgEl) msgEl.textContent = msg;
    
    toast.classList.remove('hidden');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => toast.classList.add('hidden'), 2200);
}

// Fenêtre de confirmation standardisée
export function showConfirm(msg, isDestructive = true) {
    return new Promise(resolve => {
        const modal = document.getElementById('modal-confirm');
        if (!modal) return resolve(false);

        document.getElementById('confirm-msg').textContent = msg;
        const actionBtn = document.getElementById('confirm-action-btn');
        const cancelBtn = document.getElementById('confirm-cancel-btn');
        
        actionBtn.className = isDestructive 
            ? "w-1/2 bg-rose-600 text-white py-2.5 rounded-xl cursor-pointer text-center font-bold" 
            : "w-1/2 bg-amber-500 text-slate-950 py-2.5 rounded-xl cursor-pointer text-center font-bold";
        
        const newAction = actionBtn.cloneNode(true);
        const newCancel = cancelBtn.cloneNode(true);
        actionBtn.replaceWith(newAction);
        cancelBtn.replaceWith(newCancel);

        const close = val => { modal.classList.add('hidden'); resolve(val); };
        newAction.addEventListener('click', () => close(true));
        newCancel.addEventListener('click', () => close(false));
        modal.classList.remove('hidden');
    });
}

// --- MISE À JOUR DISCRETE DU NOM DU COMMERCE ---
export function updateHeaderShopName() {
    const shopNameElement = document.getElementById('app-shop-name');
    if (shopNameElement) {
        const shopName = AppState.shopName || localStorage.getItem('margot_shop_name');
        
        if (shopName && AppState.profileConfigured) {
            shopNameElement.textContent = `• ${shopName}`;
            shopNameElement.classList.remove('hidden');
        } else {
            shopNameElement.textContent = "";
            shopNameElement.classList.add('hidden');
        }
    }
}

// Changement d'Écran
const SCREENS = ['onboarding', 'ingredients', 'products', 'margins', 'planner', 'settings'];
export function switchScreen(screenId) {
    // --- NOUVEAU : ENREGISTRER L'ÉCRAN DANS L'HISTORIQUE ---
    if (history.state?.screen !== screenId) {
        history.pushState({ screen: screenId }, "", `#${screenId}`);
    }
    SCREENS.forEach(s => {
        document.getElementById(`screen-${s}`)?.classList.add('hidden');
        const navBtn = document.getElementById(`nav-${s}`);
        if (navBtn) navBtn.className = "nav-btn flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-slate-200 transition-all cursor-pointer";
    });
    
    document.getElementById(`screen-${screenId}`)?.classList.remove('hidden');
    const activeNav = document.getElementById(`nav-${screenId}`);
    if (activeNav) activeNav.className = "nav-btn flex flex-col items-center justify-center gap-1 text-emerald-400 font-bold transition-all cursor-pointer";

    const profileBtn = document.getElementById('btn-edit-profile');
    if (profileBtn) {
        if (screenId === 'onboarding') profileBtn.classList.add('hidden');
        else if (AppState.profileConfigured) profileBtn.classList.remove('hidden');
    }

    // --- LE COMPORTEMENT DE LA SAUVEGARDE SYNCHRONISÉ ICI ---
    const backupSection = document.getElementById('backup-section');
    if (backupSection) {
        if (AppState.profileConfigured && screenId !== 'onboarding') {
            backupSection.classList.remove('hidden');
        } else {
            backupSection.classList.add('hidden');
        }
    }

    // Déclenchement des rendus selon l'écran actif
    if (screenId === 'ingredients') renderIngredients();
    if (screenId === 'products') {
        renderProducts();
        updateHeaderShopName(); // Mise à jour dynamique à la fin de l'onboarding / clic menu
    }
    if (screenId === 'margins') populateMarginDropdown();
    if (screenId === 'planner') populatePlannerInputs();
    refreshIcons();
}

// --- CENTRALISATION DES ÉCOUTEURS ---
function setupGlobalEvents() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => switchScreen(btn.dataset.screen));
    });

    const editProfileBtn = document.getElementById('btn-edit-profile');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            const currentShopName = AppState.shopName || localStorage.getItem('margot_shop_name') || "";
            const inputShop = document.getElementById('settings-shop-name');
            if (inputShop) inputShop.value = currentShopName;
            switchScreen('settings');
        });
    }

    // --- NOUVEAU : ÉCOUTEUR POUR ENREGISTRER LES MODIFICATIONS ---
    const btnSaveSettings = document.getElementById('btn-save-settings');
    if (btnSaveSettings) {
        btnSaveSettings.addEventListener('click', () => {
            const newShopName = document.getElementById('settings-shop-name')?.value.trim();
            
            if (!newShopName) {
                alert("Le nom du commerce ne peut pas être vide.");
                return;
            }

            if (typeof AppState.setShopName === 'function') {
                AppState.setShopName(newShopName);
            } else {
                AppState.shopName = newShopName;
                localStorage.setItem('margot_shop_name', newShopName);
            }

            const headerTitle = document.getElementById('app-header-title');
            if (headerTitle) headerTitle.textContent = newShopName;

            updateHeaderShopName(); // Changement immédiat du nom statique dans le header

            showToast('Profil mis à jour !');
            switchScreen('products');
        });
    }

    // --- NOUVEAU : RÉINITIALISATION TOTALE ET DESTRUCTIVE ---
    const btnDangerReset = document.getElementById('btn-danger-reset');
    if (btnDangerReset) {
        btnDangerReset.addEventListener('click', async () => {
            const confirmReset = await showConfirm(
                "🚨 ATTENTION : Vous allez supprimer DÉFINITIVEMENT votre profil, toutes vos fiches techniques et vos ingrédients. Cette action est irréversible. Continuer ?", 
                true
            );

            if (confirmReset) {
                if (typeof AppState.setProfileConfigured === 'function') {
                    AppState.setProfileConfigured(false);
                } else {
                    AppState.profileConfigured = false;
                    localStorage.setItem('margot_profile_done', 'false');
                }
                
                localStorage.removeItem(LOCAL_STORAGE_KEYS.ingredients);
                localStorage.removeItem(LOCAL_STORAGE_KEYS.products);
                localStorage.removeItem('margot_shop_name');

                document.getElementById('app-nav')?.classList.add('hidden');
                document.getElementById('backup-section')?.classList.add('hidden');
                
                updateHeaderShopName(); // Nettoie et masque le nom statique

                switchScreen('onboarding');
                showOnboardingStep(1);
                initSwipeCommerce();
                
                showToast('Application remise à zéro');
                refreshIcons();
            }
        });
    }
}

// --- LOGIQUE DE ROUTAGE ---
function routeUser() {
    const backupSection = document.getElementById('backup-section');

    if (AppState.profileConfigured) {
        document.getElementById('app-nav')?.classList.remove('hidden');
        backupSection?.classList.remove('hidden');
        
        updateHeaderShopName(); // Affiche le nom dès le démarrage de l'app si configuré
        
        switchScreen('products');
    } else {
        document.getElementById('app-nav')?.classList.add('hidden');
        backupSection?.classList.add('hidden');
        switchScreen('onboarding');
        showOnboardingStep(1);
        initSwipeCommerce();
    }
}

// --- CONFIGURATION DE LA SAUVEGARDE ET SÉCURITÉ ---
function initBackupSystem() {
    const btnExport = document.getElementById('btn-export-backup');
    const btnTriggerImport = document.getElementById('btn-trigger-import');
    const inputImport = document.getElementById('input-import-file');

    if (!btnExport || !btnTriggerImport || !inputImport) {
        console.warn("Margot Sécurité : Les boutons de sauvegarde n'ont pas été trouvés dans le DOM.");
        return;
    }

    btnExport.addEventListener('click', (e) => {
        e.preventDefault();
        try {
            const ingredients = localStorage.getItem(LOCAL_STORAGE_KEYS.ingredients) || '[]';
            const products = localStorage.getItem(LOCAL_STORAGE_KEYS.products) || '[]';

            const backupData = {
                version: "1.0",
                exportDate: new Date().toISOString(),
                data: {
                    ingredients: JSON.parse(ingredients),
                    products: JSON.parse(products)
                }
            };

            const jsonString = JSON.stringify(backupData, null, 2);
            const blob = new Blob([jsonString], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            const dateStr = new Date().toISOString().split('T')[0];
            a.href = url;
            a.download = `margot-sauvegarde-${dateStr}.json`;
            
            document.body.appendChild(a);
            a.click();
            
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast("Sauvegarde exportée !");
        } catch (error) {
            console.error("Erreur lors de l'export :", error);
            showToast("Impossible de générer la sauvegarde.");
        }
    });

    btnTriggerImport.addEventListener('click', (e) => {
        e.preventDefault();
        inputImport.click();
    });

    inputImport.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const json = JSON.parse(e.target.result);
                
                if (!json.data || !json.data.ingredients || !json.data.products) {
                    throw new Error("Format de fichier invalide : sections manquantes.");
                }

                if (!Array.isArray(json.data.ingredients) || !Array.isArray(json.data.products)) {
                    throw new Error("Format de fichier corrompu : les données doivent être des tableaux.");
                }

                const confirmOverwrite = await showConfirm(
                    "⚠️ L'importation va remplacer TOUTES vos fiches techniques et ingrédients actuels. Continuer ?",
                    true
                );

                if (confirmOverwrite) {
                    const sanitize = (str) => {
                        if (typeof str !== 'string') return str;
                        return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                    };

                    const cleanIngredients = json.data.ingredients.map(ing => ({
                        ...ing,
                        name: sanitize(ing.name),
                        unit: sanitize(ing.unit)
                    }));

                    const cleanProducts = json.data.products.map(prod => ({
                        ...prod,
                        name: sanitize(prod.name),
                        category: sanitize(prod.category)
                    }));

                    try {
                        localStorage.setItem(LOCAL_STORAGE_KEYS.ingredients, JSON.stringify(cleanIngredients));
                        localStorage.setItem(LOCAL_STORAGE_KEYS.products, JSON.stringify(cleanProducts));
                    } catch (storageError) {
                        throw new Error("La mémoire de votre navigateur est saturée. Le fichier est trop lourd.");
                    }
                    
                    showToast("Données restaurées ! Rechargement...");
                    setTimeout(() => window.location.reload(), 1000);
                }
            } catch (error) {
                console.error("Erreur lors de l'import :", error);
                alert(`Impossible d'importer la sauvegarde : ${error.message || "Fichier corrompu"}`);
            }
            inputImport.value = "";
        };
        reader.readAsText(file);
    });
}

// --- FONCTION D'INITIALISATION GLOBALE ---
function init() {
    window.switchScreen = switchScreen;
    window.showToast = showToast;
    window.refreshIcons = refreshIcons;

    initOnboarding();
    initIngredientsEvents();
    initProductsEvents();
    initMarginsEvents();
    initPlannerEvents();
    setupGlobalEvents();
    initBackupSystem();
    
    routeUser();
    refreshIcons();
}

// --- GESTION DU BOUTON RETOUR (API HISTORY) ---
window.addEventListener('popstate', (event) => {
    if (event.state && event.state.screen) {
        switchScreenFromHistory(event.state.screen);
    } else {
        routeUser();
    }
});

function switchScreenFromHistory(screenId) {
    const SCREENS = ['onboarding', 'ingredients', 'products', 'margins', 'planner', 'settings'];
    SCREENS.forEach(s => {
        document.getElementById(`screen-${s}`)?.classList.add('hidden');
        const navBtn = document.getElementById(`nav-${s}`);
        if (navBtn) navBtn.className = "nav-btn flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-slate-200 transition-all cursor-pointer";
    });
    
    document.getElementById(`screen-${screenId}`)?.classList.remove('hidden');
    const activeNav = document.getElementById(`nav-${screenId}`);
    if (activeNav) activeNav.className = "nav-btn flex flex-col items-center justify-center gap-1 text-emerald-400 font-bold transition-all cursor-pointer";

    const profileBtn = document.getElementById('btn-edit-profile');
    if (profileBtn) {
        if (screenId === 'onboarding') profileBtn.classList.add('hidden');
        else if (AppState.profileConfigured) profileBtn.classList.remove('hidden');
    }

    const backupSection = document.getElementById('backup-section');
    if (backupSection) {
        if (AppState.profileConfigured && screenId !== 'onboarding') backupSection.classList.remove('hidden');
        else backupSection.classList.add('hidden');
    }

    if (screenId === 'ingredients') renderIngredients();
    if (screenId === 'products') {
        renderProducts();
        updateHeaderShopName(); // Maintient l'affichage synchrone sur l'historique retour
    }
    if (screenId === 'margins') populateMarginDropdown();
    if (screenId === 'planner') populatePlannerInputs();
    refreshIcons();
}

// Lancement de l'application
document.addEventListener('DOMContentLoaded', init);