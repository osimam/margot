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

// Changement d'Écran
const SCREENS = ['onboarding', 'ingredients', 'products', 'margins', 'planner', 'settings'];
export function switchScreen(screenId) {
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
    if (screenId === 'products') renderProducts();
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
            // 1. Récupérer le nom actuel du commerce stocké (ajuste selon ta clé exacte dans AppState)
            const currentShopName = AppState.shopName || localStorage.getItem('margot_shop_name') || "";
            
            // 2. Pré-remplir le champ de saisie de notre nouvel écran
            const inputShop = document.getElementById('settings-shop-name');
            if (inputShop) inputShop.value = currentShopName;
            
            // 3. Basculer sur l'écran des paramètres de manière fluide
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

            // Mettre à jour le nom dans l'état et le localStorage de manière non-destructive
            if (typeof AppState.setShopName === 'function') {
                AppState.setShopName(newShopName);
            } else {
                AppState.shopName = newShopName;
                localStorage.setItem('margot_shop_name', newShopName);
            }

            // Optionnel : Mettre à jour dynamiquement un titre s'il y en a un sur ton app
            const headerTitle = document.getElementById('app-header-title');
            if (headerTitle) headerTitle.textContent = newShopName;

            showToast('Profil mis à jour !');
            
            // Rediriger l'utilisateur vers son tableau de bord de produits
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
                // 1. On remet le profil à zéro dans l'état et le stockage
                if (typeof AppState.setProfileConfigured === 'function') {
                    AppState.setProfileConfigured(false);
                } else {
                    AppState.profileConfigured = false;
                    localStorage.setItem('margot_profile_done', 'false');
                }
                
                // 2. SÉCURITÉ NETTOYAGE : On efface TOUTES les données de l'artisan
                localStorage.removeItem(LOCAL_STORAGE_KEYS.ingredients);
                localStorage.removeItem(LOCAL_STORAGE_KEYS.products);
                localStorage.removeItem('margot_shop_name'); // Nettoie aussi le nom si stocké à part

                // 3. On masque les menus et la section sauvegarde
                document.getElementById('app-nav')?.classList.add('hidden');
                document.getElementById('backup-section')?.classList.add('hidden');
                
                // 4. On renvoie à la case départ (onboarding étape 1)
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
        // L'utilisateur a déjà configuré son profil
        document.getElementById('app-nav')?.classList.remove('hidden');
        backupSection?.classList.remove('hidden'); // <-- Affiche les boutons de sauvegarde
        switchScreen('products');
    } else {
        // L'utilisateur est sur l'écran de paramétrage (onboarding)
        document.getElementById('app-nav')?.classList.add('hidden');
        backupSection?.classList.add('hidden'); // <-- Cache les boutons de sauvegarde
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
                
                // 1. SÉCURITÉ : Vérification de la structure globale du fichier
                if (!json.data || !json.data.ingredients || !json.data.products) {
                    throw new Error("Format de fichier invalide : sections manquantes.");
                }

                // SÉCURITÉ : Vérification que les données critiques sont bien des listes (Arrays)
                if (!Array.isArray(json.data.ingredients) || !Array.isArray(json.data.products)) {
                    throw new Error("Format de fichier corrompu : les données doivent être des tableaux.");
                }

                const confirmOverwrite = await showConfirm(
                    "⚠️ L'importation va remplacer TOUTES vos fiches techniques et ingrédients actuels. Continuer ?",
                    true
                );

                if (confirmOverwrite) {
                    // 2. SÉCURITÉ : Fonction de nettoyage (Sanitizer) anti-injection XSS
                    const sanitize = (str) => {
                        if (typeof str !== 'string') return str;
                        return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                    };

                    // Nettoyage complet de la liste des ingrédients
                    const cleanIngredients = json.data.ingredients.map(ing => ({
                        ...ing,
                        name: sanitize(ing.name),
                        unit: sanitize(ing.unit)
                    }));

                    // Nettoyage complet de la liste des produits
                    const cleanProducts = json.data.products.map(prod => ({
                        ...prod,
                        name: sanitize(prod.name),
                        category: sanitize(prod.category)
                    }));

                    // 3. SÉCURITÉ : Tentative d'écriture avec gestion d'un LocalStorage saturé
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
    // 1. Liaison globale pour court-circuiter les imports circulaires de onboarding.js
    window.switchScreen = switchScreen;
    window.showToast = showToast;
    window.refreshIcons = refreshIcons;

    // 2. Initialisation des composants et événements
    initOnboarding();
    initIngredientsEvents();
    initProductsEvents();
    initMarginsEvents();
    initPlannerEvents();
    setupGlobalEvents();
    initBackupSystem();
    
    // 3. Routage de l'utilisateur
    routeUser();
    refreshIcons();
}

// Lancement de l'application
document.addEventListener('DOMContentLoaded', init);