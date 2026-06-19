// Correction de la casse de l'import (pour correspondre à l'utilisation plus bas)
import { AppState } from './store/appState.js'; 
import { initOnboarding, initSwipeCommerce, showOnboardingStep } from './components/onboarding.js';
import { renderIngredients, initIngredientsEvents } from './components/ingredients.js';
import { renderProducts, initProductsEvents } from './components/products.js';
import { populateMarginDropdown, initMarginsEvents } from './components/margins.js';
import { populatePlannerInputs, initPlannerEvents } from './components/planner.js';

let _lucidePending = false;
let authMode = 'login'; // <-- CORRECTION : Déplacé ici pour être accessible partout dans le fichier

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

// --- MISE À ZONE DISCRETE DU NOM DU COMMERCE ---
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
const SCREENS = ['auth', 'onboarding', 'ingredients', 'products', 'margins', 'planner', 'settings'];
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
        if (screenId === 'onboarding' || screenId === 'auth') profileBtn.classList.add('hidden');
        else if (AppState.profileConfigured) profileBtn.classList.remove('hidden');
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
        btnSaveSettings.addEventListener('click', async () => {
            const newShopName = document.getElementById('settings-shop-name')?.value.trim();
            
            if (!newShopName) {
                alert("Le nom du commerce ne peut pas être vide.");
                return;
            }

            // 🌟 AJOUT : Sauvegarde également dans les user_metadata de Supabase pour persister au changement de compte
            const supabaseInstance = window.supabase || (typeof supabase !== 'undefined' ? supabase : null);
            if (supabaseInstance) {
                try {
                    await supabaseInstance.auth.updateUser({
                        data: { shop_name: newShopName }
                    });
                } catch (metaErr) {
                    console.warn("Impossible de synchroniser le nom du commerce sur Supabase :", metaErr);
                }
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
    
    // --- NOUVEAU : BOUTON SE DÉCONNECTER (SUPABASE) ---
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            const confirmLogout = await showConfirm("Voulez-vous vous déconnecter de votre espace Margot ?", false);
            
            if (confirmLogout) {
                const supabaseInstance = window.supabase || (typeof supabase !== 'undefined' ? supabase : null);
                if (supabaseInstance) {
                    // 1. On ordonne à Supabase de fermer la session Cloud
                    await supabaseInstance.auth.signOut();
                }

                // 2. On nettoie TOUT le cache local pour ne laisser aucune trace sur le navigateur
                localStorage.clear(); 

                // 3. On vide instantanément l'état de l'application
                AppState.ingredients = [];
                AppState.products = [];
                AppState.profileConfigured = false;
                AppState.shopName = "";

                // 4. On masque la navigation et on redirige vers l'écran de connexion
                document.getElementById('app-nav')?.classList.add('hidden');
                switchScreen('auth');
                showToast('Vous avez été déconnecté');
            }
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
                // Bloquer explicitement la configuration locale
                if (typeof AppState.setProfileConfigured === 'function') {
                    AppState.setProfileConfigured(false);
                } else {
                    AppState.profileConfigured = false;
                }
                localStorage.setItem('margot_profile_done', 'false'); // 👈 CRUCIAL : Informe le système de bloquer la resync au refresh
                
                localStorage.removeItem('margot_ingredients');
                localStorage.removeItem('margot_products');
                localStorage.removeItem('margot_shop_name');

                // Vider l'état mémoire instantanément
                AppState.ingredients = [];
                AppState.products = [];
                AppState.shopName = "";

                document.getElementById('app-nav')?.classList.add('hidden');
                
                updateHeaderShopName(); // Nettoie et masque le nom statique

                switchScreen('onboarding');
                showOnboardingStep(1);
                initSwipeCommerce();
                
                showToast('Application remise à zéro');
                refreshIcons();
            }
        });
    }

    // --- GESTION DE L'ÉCRAN D'AUTHENTIFICATION (UI ONLY) ---
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const btnAuthText = document.getElementById('btn-auth-text');
    const authSubtitle = document.getElementById('auth-subtitle');

    if (tabLogin && tabRegister) {
        // Clic sur l'onglet Connexion
        tabLogin.addEventListener('click', () => {
            authMode = 'login';
            tabLogin.className = "w-1/2 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-slate-900 text-emerald-400 transition-all cursor-pointer";
            tabRegister.className = "w-1/2 py-2 text-xs font-bold uppercase tracking-wider rounded-lg text-slate-500 hover:text-slate-300 transition-all cursor-pointer";
            if (btnAuthText) btnAuthText.textContent = "Se connecter à mon espace";
            if (authSubtitle) authSubtitle.textContent = "Pilotez la rentabilité de votre commerce et sécurisez vos marges en temps réel.";
        });

        // Clic sur l'onglet Inscription
        tabRegister.addEventListener('click', () => {
            authMode = 'register';
            tabRegister.className = "w-1/2 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-slate-900 text-emerald-400 transition-all cursor-pointer";
            tabLogin.className = "w-1/2 py-2 text-xs font-bold uppercase tracking-wider rounded-lg text-slate-500 hover:text-slate-300 transition-all cursor-pointer";
            if (btnAuthText) btnAuthText.textContent = "Créer mon compte artisan";
            if (authSubtitle) authSubtitle.textContent = "Rejoignez Margot pour sauvegarder automatiquement vos fiches techniques à l'abri des pannes.";
        });
    }

    // --- ACTION : DEMANDE DE MOT DE PASSE OUBLIÉ ---
    const btnForgotPassword = document.getElementById('btn-forgot-password');
    if (btnForgotPassword) {
        btnForgotPassword.addEventListener('click', async () => {
            const email = document.getElementById('auth-email')?.value.trim();
            
            if (!email) {
                alert("Veuillez d'abord saisir votre adresse e-mail dans le champ ci-dessus.");
                return;
            }

            // 🔒 Récupération du jeton hCaptcha
            let captchaToken = typeof hcaptcha !== 'undefined' ? hcaptcha.getResponse() : null;
            
            // Si le token est vide ou a expiré, on demande explicitement à l'utilisateur de cocher la case
            if (!captchaToken) {
                alert("Veuillez cocher la case 'Je ne suis pas un robot' (hCaptcha) juste au-dessus pour autoriser l'envoi de l'e-mail.");
                return;
            }

            const supabaseInstance = window.supabase || (typeof supabase !== 'undefined' ? supabase : null);
            if (!supabaseInstance) return;

            try {
                // Double sécurité : on injecte le token selon les deux normes de l'API Supabase
                const { error } = await supabaseInstance.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin,
                    captchaToken: captchaToken, // Norme V2 récente
                    options: { 
                        captchaToken: captchaToken // Ancienne norme / alternative
                    }
                });

                if (error) throw error;
                alert("Un e-mail de réinitialisation vous a été envoyé. Cliquez sur le lien s'y trouvant pour modifier votre mot de passe.");
            } catch (error) {
                alert(`Erreur : ${error.message}`);
            } finally {
                // 🔄 On réinitialise TOUJOURS le hCaptcha après une tentative pour éviter les jetons périmés
                if (typeof hcaptcha !== 'undefined') hcaptcha.reset();
            }
        });
    }

    // --- ACTION : MODIFICATION DE L'EMAIL DEPUIS LES PARAMÈTRES ---
    const btnUpdateEmail = document.getElementById('btn-update-email');
    if (btnUpdateEmail) {
        btnUpdateEmail.addEventListener('click', async () => {
            const newEmail = document.getElementById('settings-email')?.value.trim();
            if (!newEmail) {
                alert("Veuillez saisir une adresse e-mail valide.");
                return;
            }

            const supabaseInstance = window.supabase || (typeof supabase !== 'undefined' ? supabase : null);
            if (!supabaseInstance) return;

            try {
                const { error } = await supabaseInstance.auth.updateUser({ email: newEmail });
                if (error) throw error;
                
                alert("Une demande de confirmation a été envoyée à votre ancienne ET votre nouvelle adresse e-mail. Le changement sera effectif après validation des deux liens.");
                document.getElementById('settings-email').value = "";
            } catch (error) {
                alert(`Erreur : ${error.message}`);
            }
        });
    }

    // --- ACTION : MODIFICATION DU MOT DE PASSE DEPUIS LES PARAMÈTRES ---
    const btnUpdatePassword = document.getElementById('btn-update-password');
    if (btnUpdatePassword) {
        btnUpdatePassword.addEventListener('click', async () => {
            const newPassword = document.getElementById('settings-password')?.value;
            
            if (!newPassword) {
                alert("Veuillez renseigner un mot de passe.");
                return;
            }

            // Application de tes règles strictes de sécurité à 12 caractères
            if (newPassword.length < 12) {
                alert("Sécurité : Le mot de passe doit contenir au moins 12 caractères.");
                return;
            }

            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
            if (!passwordRegex.test(newPassword)) {
                alert("Sécurité : Le mot de passe doit contenir au moins une lettre minuscule, une lettre majuscule et un chiffre.");
                return;
            }

            const supabaseInstance = window.supabase || (typeof supabase !== 'undefined' ? supabase : null);
            if (!supabaseInstance) return;

            try {
                const { error } = await supabaseInstance.auth.updateUser({ password: newPassword });
                if (error) throw error;
                
                showToast("Mot de passe mis à jour !");
                document.getElementById('settings-password').value = "";
            } catch (error) {
                alert(`Erreur : ${error.message}`);
            }
        });
    }

    // --- GESTION DES ACTIONS SUPABASE (CONNEXION & INSCRIPTION) ---
    const btnAuthSubmit = document.getElementById('btn-auth-submit');
    if (btnAuthSubmit) {
        btnAuthSubmit.addEventListener('click', async () => {
            const email = document.getElementById('auth-email')?.value.trim();
            const password = document.getElementById('auth-password')?.value;
            
            // 🔒 Récupération du jeton hCaptcha
            const captchaToken = typeof hcaptcha !== 'undefined' ? hcaptcha.getResponse() : null;

            // Récupération sécurisée de l'instance Supabase connectée
            const supabaseInstance = window.supabase || (typeof supabase !== 'undefined' ? supabase : null);

            if (!supabaseInstance) {
                alert("L'application n'est pas encore connectée au serveur. Veuillez patienter ou recharger la page.");
                return;
            }

            // Détection du mode (Connexion ou Inscription) selon l'onglet vert actif
            const tabRegister = document.getElementById('tab-register');
            const isRegisterMode = tabRegister && tabRegister.classList.contains('text-emerald-400');

            // Validation des champs vides
            if (!email || !password) {
                alert("Veuillez remplir tous les champs.");
                return;
            }

            // 🔒 Validation hCaptcha obligatoire
            if (!captchaToken) {
                alert("Veuillez cocher la case 'Je ne suis pas un robot' pour valider la sécurité.");
                return;
            }

            // 🔒 Nouvelles règles de sécurité du mot de passe (appliquées uniquement à l'inscription)
            if (isRegisterMode) {
                if (password.length < 12) {
                    alert("Sécurité : Le mot de passe doit contenir au moins 12 caractères.");
                    return;
                }

                // Vérifie s'il y a au moins une majuscule, une minuscule, une lettre et un chiffre
                const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
                if (!passwordRegex.test(password)) {
                    alert("Sécurité : Le mot de passe doit contenir au moins une lettre minuscule, une lettre majuscule et un chiffre.");
                    return;
                }
            }

            // Désactivation temporaire du bouton pendant le chargement
            btnAuthSubmit.disabled = true;
            const originalText = btnAuthSubmit.innerHTML;
            btnAuthSubmit.innerHTML = `<span>Vérification...</span>`;

            try {
                if (!isRegisterMode) {
                    // --- TENTATIVE DE CONNEXION AVEC JETON CAPTCHA ---
                    const { data, error } = await supabaseInstance.auth.signInWithPassword({
                        email: email,
                        password: password,
                        options: { captchaToken: captchaToken } // 👈 Transmission du jeton à Supabase
                    });

                    if (error) throw error;
                    showToast("Connexion réussie !");
                    
                } else {
                    // --- TENTATIVE D'INSCRIPTION AVEC JETON CAPTCHA ET REDIRECTION UNIQUE ---
                    const { data, error } = await supabaseInstance.auth.signUp({
                        email: email,
                        password: password,
                        options: { 
                            captchaToken: captchaToken,
                            redirectTo: window.location.origin // 🌟 FORCE la redirection vers l'adresse exacte d'où est émise la demande !
                        }
                    });

                    if (error) throw error;

                    alert("Compte créé avec succès ! Vérifiez votre boîte e-mail pour confirmer votre inscription avant de vous connecter.");
                }

                // Une fois connecté ou inscrit, on relance le routage automatique
                await routeUser();

            } catch (error) {
                console.error("Erreur d'authentification :", error);
                alert(`Erreur : ${error.message || "Impossible de s'authentifier"}`);
                
                // 🔄 Réinitialise le widget hCaptcha en cas d'échec pour permettre un nouvel essai immédiatement
                if (typeof hcaptcha !== 'undefined') hcaptcha.reset();
            } finally {
                // Réactivation du bouton
                btnAuthSubmit.disabled = false;
                btnAuthSubmit.innerHTML = originalText;
            }
        });
    }
}

// --- LOGIQUE DE ROUTAGE ET SYNCHRONISME DES DONNÉES CLOUD ---
async function routeUser() {
    try {
        const supabaseInstance = window.supabase || (typeof supabase !== 'undefined' ? supabase : null);

        if (!supabaseInstance) {
            console.warn("Supabase n'est pas encore prêt, nouvelle tentative dans 200ms...");
            setTimeout(routeUser, 200);
            return;
        }

        // --- NOUVEAU : CAPTURER L'ÉVÉNEMENT DE RÉCUPÉRATION DE MOT DE PASSE (PASSWORD RECOVERY) ---
        supabaseInstance.auth.onAuthStateChange(async (event, session) => {
            if (event === "PASSWORD_RECOVERY") {
                const newPassword = prompt("Veuillez saisir votre nouveau mot de passe (12 caractères min, avec Majuscule, Minuscule et Chiffre) :");
                
                if (!newPassword) {
                    alert("Procédure annulée. Le mot de passe n'a pas été modifié.");
                    return;
                }

                // Règles strictes Margot
                const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
                if (newPassword.length < 12 || !passwordRegex.test(newPassword)) {
                    alert("Sécurité insuffisante (12 caractères, Maj, Min, Chiffre requis). Le mot de passe n'a pas été modifié. Veuillez recommencer la procédure.");
                    return;
                }

                try {
                    const { error } = await supabaseInstance.auth.updateUser({ password: newPassword });
                    if (error) throw error;
                    
                    alert("Votre mot de passe a été modifié avec succès ! Vous pouvez maintenant vous connecter.");
                    await supabaseInstance.auth.signOut();
                    window.location.reload();
                } catch (err) {
                    alert(`Erreur lors de la mise à jour : ${err.message}`);
                }
            }
        });

        // 1. On demande à Supabase s'il y a une session active
        const { data: { session } } = await supabaseInstance.auth.getSession();

        // ÉTAPE 1 : Si l'artisan n'est PAS connecté -> Direction l'écran Auth
        if (!session) {
            document.getElementById('app-nav')?.classList.add('hidden');
            switchScreen('auth');
            return; 
        }

        // 🌟 NOUVEAU & CORRECTIF CACHE : Récupération dynamique du nom du commerce depuis les métadonnées de la session active
        const userShopName = session.user.user_metadata?.shop_name;
        if (userShopName) {
            AppState.shopName = userShopName;
            localStorage.setItem('margot_shop_name', userShopName);
        } else {
            // Si aucun nom n'est défini dans le compte en ligne, on nettoie l'ancien cache pour éviter les conflits
            AppState.shopName = "";
            localStorage.removeItem('margot_shop_name');
        }

        // 🚀 AJOUT : ANNIHILATION DU TÉLÉCHARGEMENT EN MODE ONBOARDING/RÉINITIALISATION
        const isProfileDone = localStorage.getItem('margot_profile_done');
        if (isProfileDone === 'false') {
            AppState.profileConfigured = false;
            AppState.ingredients = [];
            AppState.products = [];
            document.getElementById('app-nav')?.classList.add('hidden');
            switchScreen('onboarding');
            showOnboardingStep(1);
            initSwipeCommerce();
            return; // 🛑 Stop ! On ne télécharge rien du Cloud, l'utilisateur réinitialise.
        }

        // 🚀 SYNC CLOUD ET DÉTECTION AUTOMATIQUE DE PROFIL (Si pas en cours de réinitialisation)
        let hasCloudData = false;
        try {
            // 1. Chargement des ingrédients
            const { data: cloudIngredients, error: ingError } = await supabaseInstance
                .from('ingredients')
                .select('*')
                .order('name', { ascending: true });

            if (ingError) throw ingError;
            if (cloudIngredients && cloudIngredients.length > 0) {
                AppState.ingredients = cloudIngredients;
                hasCloudData = true; 
            }

            // 2. Chargement des produits (Fiches techniques)
            const { data: cloudProducts, error: prodError } = await supabaseInstance
                .from('products')
                .select('*')
                .order('name', { ascending: true });

            if (prodError) throw prodError;
            
            if (cloudProducts && cloudProducts.length > 0) {
                hasCloudData = true;
                AppState.products = cloudProducts.map(p => {
                    let metaSim = {};
                    try {
                        if (p.category && p.category.startsWith('{')) {
                            metaSim = JSON.parse(p.category);
                        }
                    } catch(e) { metaSim = {}; }

                    // 🛠️ AJOUT SÉCURITÉ ICI AUSSI
                    let parsedComponents = [];
                    try {
                        if (typeof p.components === 'string') {
                            parsedComponents = JSON.parse(p.components);
                        } else if (Array.isArray(p.components)) {
                            parsedComponents = p.components;
                        }
                    } catch(e) { parsedComponents = []; }

                    return {
                        id: p.id,
                        name: p.name,
                        ingredients: parsedComponents, // 👈 Correction ici aussi
                        sellingPrice: p.price_override,
                        tva: p.tva,
                        pertes: metaSim.pertes !== undefined ? metaSim.pertes : 0,
                        targetMargin: metaSim.targetMargin !== undefined ? metaSim.targetMargin : 70,
                        targetCoeff: metaSim.targetCoeff !== undefined ? metaSim.targetCoeff : 3.5
                    };
                });
            }
        } catch (syncError) {
            console.error("Impossible de récupérer les données en ligne :", syncError.message);
        }

        // Si des données ont été trouvées dans le Cloud, on valide l'onboarding de l'appareil automatiquement
        if (hasCloudData) {
            AppState.profileConfigured = true;
            localStorage.setItem('margot_profile_done', 'true');
        }

        // ÉTAPE 2 : Routage vers le bon écran selon l'état du profil mis à jour
        if (AppState.profileConfigured) {
            document.getElementById('app-nav')?.classList.remove('hidden');
            updateHeaderShopName(); 
            switchScreen('products');
        } else {
            document.getElementById('app-nav')?.classList.add('hidden');
            switchScreen('onboarding');
            showOnboardingStep(1);
            initSwipeCommerce();
        }

    } catch (error) {
        console.error("Erreur lors du routage de l'utilisateur :", error);
        switchScreen('auth');
    }
}

// --- FONCTION D'INITIALISATION GLOBALE ---
async function init() {
    window.switchScreen = switchScreen;
    window.switchScreenFromHistory = switchScreenFromHistory; // Exportation pour popstate
    window.showToast = showToast;
    window.refreshIcons = refreshIcons;

    initOnboarding();
    initIngredientsEvents();
    initProductsEvents();
    initMarginsEvents();
    initPlannerEvents();
    setupGlobalEvents();
    
    await routeUser();
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
    const SCREENS = ['auth', 'onboarding', 'ingredients', 'products', 'margins', 'planner', 'settings'];
    
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
        if (screenId === 'onboarding' || screenId === 'auth') profileBtn.classList.add('hidden');
        else if (AppState.profileConfigured) profileBtn.classList.remove('hidden');
    }

    if (screenId === 'ingredients') renderIngredients();
    if (screenId === 'products') {
        renderProducts();
        updateHeaderShopName();
    }
    if (screenId === 'margins') populateMarginDropdown();
    if (screenId === 'planner') populatePlannerInputs();
    refreshIcons();
}

// Lancement de l'application
document.addEventListener('DOMContentLoaded', init);