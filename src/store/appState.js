const Storage = {
    get(key, fallback = null) {
        try {
            const raw = localStorage.getItem(key);
            return raw !== null ? JSON.parse(raw) : fallback;
        } catch { return fallback; }
    },
    set(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
    }
};

export const AppState = {
    // --- 1. ÉTATS DE CONFIGURATION ET FILTRES ---
    profileConfigured: localStorage.getItem('margot_profile_done') === 'true',
    currentScreen: 'onboarding',
    
    // --- 2. ÉTATS TEMPORAIRES (ONBOARDING) ---
    onboardSelectedJobId: null,
    onboardCustomProducts: [],
    onboardCustomIngredients: [],

    // --- 3. DONNÉES DE L'ARTISAN ---
    products: Storage.get('margot_products', []),
    ingredients: Storage.get('margot_ingredients', []),
    recipes: Storage.get('margot_recipes', []),
    
    simMode: localStorage.getItem('margot_sim_mode') || 'A',
    simTva: parseFloat(localStorage.getItem('margot_sim_tva')) || 10,
    _selectedProduct: null,
    _marginChart: null,

    // --- 4. MÉTHODES DE MUTATION ---
    setProfileConfigured(isConfigured) {
        this.profileConfigured = isConfigured;
        localStorage.setItem('margot_profile_done', isConfigured ? 'true' : 'false');
    },

    setSelectedJob(jobId) {
        this.onboardSelectedJobId = jobId;
    },

    getProductCostCents(product) {
        if (!product || !product.ingredients || product.ingredients.length === 0) return 0;
        
        let totalCents = 0;
        product.ingredients.forEach(recipeIng => {
            const baseIng = this.ingredients.find(x => x.id === recipeIng.id);
            if (baseIng && baseIng.qty > 0) {
                const pricePerUnit = baseIng.price / baseIng.qty;
                totalCents += pricePerUnit * recipeIng.amount;
            }
        });
        return Math.round(totalCents);
    },

    clearAllData() {
        localStorage.clear();
        this.profileConfigured = false;
        this.onboardSelectedJobId = null;
        this.onboardCustomProducts = [];
        this.onboardCustomIngredients = [];
        this.products = [];
        this.ingredients = [];
        this.recipes = [];
        this.simMode = 'A';
        this.simTva = 10;
        this._selectedProduct = null;
        this._marginChart = null;
    }
};