import { AppState } from '../store/appState.js';
import { PriceUtils, escapeHtml } from '../utils/priceUtils.js';
import { showToast, showConfirm, refreshIcons } from '../main.js';

export function initProductsEvents() {
    const btnOpen = document.getElementById('btn-open-product-modal');
    const btnCancel = document.getElementById('btn-cancel-product');
    const btnSave = document.getElementById('btn-save-product');

    if (btnOpen) btnOpen.addEventListener('click', openNewProductModal);
    if (btnCancel) btnCancel.addEventListener('click', () => {
        const modal = document.getElementById('modal-product') || document.getElementById('product-modal');
        if (modal) modal.classList.add('hidden');
    });
    if (btnSave) btnSave.addEventListener('click', saveProduct);
}

export function renderProducts() {
    const container = document.getElementById('products-list');
    if (!container) return;

    const products = AppState.products || [];

    if (products.length === 0) {
        container.innerHTML = `
            <div class="text-center p-8 text-slate-500 text-xs font-medium">
                Aucun produit dans votre catalogue.<br>Cliquez sur "Créer" pour ajouter votre premier produit.
            </div>`;
        return;
    }

    container.innerHTML = products.map(product => {
        // Calcul dynamique uniquement du coût de revient
        const costPrice = calculateCostPrice(product);
        
        return `
            <div class="bg-slate-800/60 border border-slate-700/40 p-4 rounded-xl flex justify-between items-center group transition-all duration-200 hover:border-slate-600/50">
                <div class="min-w-0 flex-1">
                    <h4 class="font-bold text-sm text-slate-200 truncate">${escapeHtml(product.name)}</h4>
                    <p class="text-[11px] text-slate-400 mt-0.5">
                        Coût de revient : <span class="text-emerald-400 font-semibold">${costPrice.toFixed(2)} €</span>
                    </p>
                </div>
                <div class="flex items-center gap-1 shrink-0 ml-4">
                    <button data-id="${product.id}" class="btn-edit-recipe p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-900 rounded-lg transition-colors" title="Modifier la fiche technique">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/><path d="M6 14h10"/></svg>
                    </button>
                    <button data-id="${product.id}" class="btn-delete-product p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors" title="Supprimer le produit">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Ré-association des événements de clics
    container.querySelectorAll('.btn-edit-recipe').forEach(btn => {
        btn.addEventListener('click', (e) => { e.preventDefault(); openProductRecipeModal(btn.dataset.id); });
    });
    container.querySelectorAll('.btn-delete-product').forEach(btn => {
        btn.addEventListener('click', (e) => { e.preventDefault(); deleteProduct(btn.dataset.id); });
    });

    refreshIcons();
}

function openNewProductModal() {
    const modal = document.getElementById('modal-product') || document.getElementById('product-modal');
    const title = document.getElementById('modal-product-title') || document.getElementById('product-modal-title');
    const idField = document.getElementById('product-id-field') || document.getElementById('product-id');
    const nameField = document.getElementById('product-name');
    const priceField = document.getElementById('product-price'); // Nouveau champ

    if (title) title.innerHTML = `<i data-lucide="plus-circle" class="text-emerald-400 w-5 h-5"></i>Créer un Produit`;
    if (idField) idField.value = ""; 
    if (nameField) nameField.value = "";
    if (priceField) priceField.value = ""; // Vider le prix
    
    renderRecipeIngredientsSelector([]); 
    if (modal) modal.classList.remove('hidden');
    refreshIcons();
}

function openProductRecipeModal(id) {
    const p = AppState.products.find(x => x.id === id); 
    if (!p) return;

    const modal = document.getElementById('modal-product') || document.getElementById('product-modal');
    const title = document.getElementById('modal-product-title') || document.getElementById('product-modal-title');
    const idField = document.getElementById('product-id-field') || document.getElementById('product-id');
    const nameField = document.getElementById('product-name');
    const priceField = document.getElementById('product-price'); // Nouveau champ

    if (title) title.innerHTML = `<i data-lucide="notebook" class="text-emerald-400 w-5 h-5"></i>Modifier : ${escapeHtml(p.name)}`;
    if (idField) idField.value = p.id; 
    if (nameField) nameField.value = p.name;
    if (priceField) priceField.value = p.sellingPrice || ""; // Charger le prix stocké
    
    renderRecipeIngredientsSelector(p.ingredients || []); 
    if (modal) modal.classList.remove('hidden');
    refreshIcons();
}

function renderRecipeIngredientsSelector(recipeIngredients) {
    const container = document.getElementById('product-ingredients-selector');
    if (!container) return;
    
    if (!AppState.ingredients || AppState.ingredients.length === 0) { 
        container.innerHTML = `<p class="text-[11px] text-slate-500 text-center py-4">Créez d'abord des matières premières dans l'onglet dédié.</p>`; 
        return; 
    }
    
    container.innerHTML = AppState.ingredients.map(baseIng => {
        const match = recipeIngredients.find(x => x.id === baseIng.id);
        return `
            <div class="flex items-center justify-between gap-2 bg-slate-950/40 p-2 border border-slate-800/80 rounded-xl">
                <label class="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                    <input type="checkbox" data-ing-id="${baseIng.id}" ${match ? 'checked' : ''} class="recipe-cb w-3.5 h-3.5 text-emerald-600 bg-slate-900 border-slate-700 rounded">
                    <span class="text-[11px] text-slate-200 truncate font-medium">${escapeHtml(baseIng.name)}</span>
                </label>
                <div class="flex items-center gap-1 shrink-0 ${match ? '' : 'opacity-30 pointer-events-none'}" data-row-id="${baseIng.id}">
                    <input type="number" inputmode="decimal" value="${match ? match.amount : ''}" placeholder="0" class="w-14 bg-slate-900 border border-slate-700 text-slate-100 rounded p-1 text-center font-mono text-[11px]">
                    <span class="text-[10px] text-slate-400 w-5 uppercase font-bold">${baseIng.unit}</span>
                </div>
            </div>
        `;
    }).join('');

    container.querySelectorAll('.recipe-cb').forEach(cb => {
        cb.addEventListener('change', () => {
            const row = container.querySelector(`[data-row-id="${cb.dataset.ingId}"]`);
            if (!row) return;
            const input = row.querySelector('input');
            if (cb.checked) { 
                row.classList.remove('opacity-30', 'pointer-events-none'); 
                if (input) input.focus(); 
            } else { 
                row.classList.add('opacity-30', 'pointer-events-none'); 
                if (input) input.value = ""; 
            }
        });
    });
}

function saveProduct() {
    const idField = document.getElementById('product-id-field') || document.getElementById('product-id');
    const nameField = document.getElementById('product-name');
    const priceField = document.getElementById('product-price'); // Récupération du champ prix
    
    const id = idField ? idField.value : "";
    const name = nameField ? nameField.value.trim() : "";
    const sellingPrice = priceField ? parseFloat(priceField.value.replace(',', '.')) : 0;
    
    if (!name) { showToast("Le nom du produit est requis.", "error"); return; }
    if (isNaN(sellingPrice) || sellingPrice < 0) { showToast("Veuillez saisir un prix de vente valide.", "error"); return; }
    
    const selectedIngredients = []; 
    let err = false;
    
    document.querySelectorAll('#product-ingredients-selector input[type="checkbox"]:checked').forEach(cb => {
        const row = document.querySelector(`[data-row-id="${cb.dataset.ingId}"] input`);
        const amt = row ? parseFloat(row.value) : NaN;
        if (isNaN(amt) || amt <= 0) err = true; 
        else selectedIngredients.push({ id: cb.dataset.ingId, amount: amt });
    });
    
    if (err) { showToast("Veuillez saisir des quantités valides pour les matières cochées.", "error"); return; }

    if (id) {
        const p = AppState.products.find(x => x.id === id); 
        if (p) { 
            p.name = name; 
            p.ingredients = selectedIngredients; 
            p.sellingPrice = sellingPrice; // Mise à jour du prix
        }
    } else {
        const newId = 'p_' + Math.random().toString(36).substr(2, 9);
        AppState.products.push({ 
            id: newId, 
            name, 
            ingredients: selectedIngredients,
            sellingPrice: sellingPrice, // Enregistrement du prix
            tva: 10
        });
    }

    localStorage.setItem('margot_products', JSON.stringify(AppState.products)); 
    
    const modal = document.getElementById('modal-product') || document.getElementById('product-modal');
    if (modal) modal.classList.add('hidden'); 
    
    renderProducts(); 
    showToast("Produit sauvegardé avec succès !");
}

async function deleteProduct(id) {
    const p = AppState.products.find(x => x.id === id); 
    if (!p) return;
    
    const confirmed = await showConfirm(`Supprimer le produit "${p.name}" ?`);
    if (!confirmed) return;
    
    AppState.products = AppState.products.filter(x => x.id !== id); 
    localStorage.setItem('margot_products', JSON.stringify(AppState.products)); 
    
    renderProducts(); 
    showToast("Produit supprimé");
}
/**
 * Calcule dynamiquement le coût de revient d'un produit en fonction de ses ingrédients
 * @param {Object} product 
 * @returns {number} Coût de revient en euros
 */
function calculateCostPrice(product) {
    if (!product.ingredients || product.ingredients.length === 0) return 0;

    let totalCents = 0;

    product.ingredients.forEach(recipeIng => {
        // On cherche la matière première correspondante dans l'état global
        const baseIng = AppState.ingredients.find(x => x.id === recipeIng.id);
        
        if (baseIng && baseIng.qty > 0) {
            // Prix pour 1 unité (ex: prix au kg ou au litre) en centimes
            const pricePerUnit = baseIng.price / baseIng.qty;
            
            // Coût proportionnel pour la quantité utilisée dans la recette
            totalCents += pricePerUnit * recipeIng.amount;
        }
    });

    // On retourne le résultat converti en Euros (2 décimales)
    return totalCents / 100;
}