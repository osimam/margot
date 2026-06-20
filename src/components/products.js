import { AppState } from '../store/appState.js';
import { PriceUtils, escapeHtml } from '../utils/priceUtils.js';
import { showToast, showConfirm, refreshIcons } from '../main.js';
// 🚀 Importation de notre client Supabase connecté au Cloud
import { supabaseClient } from '../store/supabaseClient.js';

export function initProductsEvents() {
    const btnOpen = document.getElementById('btn-open-product-modal');
    // Réalignement sur le bon ID du bouton Annuler/Fermer de index.html
    const btnCancel = document.getElementById('btn-close-product-modal') || document.getElementById('btn-cancel-product');
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
            <div class="text-center p-8 text-slate-500 text-xs font-medium col-span-2 bg-slate-900 border border-dashed border-slate-800 rounded-2xl">
                Aucun produit dans votre catalogue.<br>Cliquez sur "Créer" pour ajouter votre premier produit.
            </div>`;
        return;
    }

    container.innerHTML = products.map(product => {
        const costPrice = calculateCostPrice(product);
        
        return `
            <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl flex justify-between items-center group transition-all duration-200 hover:border-slate-700">
                <div class="min-w-0 flex-1">
                    <h4 class="font-bold text-xs text-slate-200 tracking-wide truncate">${escapeHtml(product.name)}</h4>
                    <p class="text-[11px] text-slate-400 mt-0.5 font-mono">
                        Coût de revient : <span class="text-emerald-400 font-bold">${costPrice.toFixed(2)} €</span>
                    </p>
                </div>
                <div class="flex items-center gap-1.5 shrink-0 ml-4">
                    <button data-id="${product.id}" class="btn-edit-recipe p-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl cursor-pointer hover:text-emerald-400 hover:border-slate-600 transition" title="Modifier la fiche technique">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/><path d="M6 14h10"/></svg>
                    </button>
                    <button data-id="${product.id}" class="btn-delete-product p-2 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl cursor-pointer hover:text-rose-400 hover:border-rose-600 transition" title="Supprimer le produit">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');

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

    if (title) title.innerHTML = `<i data-lucide="plus-circle" class="text-emerald-400 w-5 h-5"></i>Créer un Produit`;
    if (idField) idField.value = ""; 
    if (nameField) nameField.value = "";
    
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

    if (title) title.innerHTML = `<i data-lucide="notebook" class="text-emerald-400 w-5 h-5"></i>Modifier la fiche`;
    if (idField) idField.value = p.id; 
    if (nameField) nameField.value = p.name;
    
    renderRecipeIngredientsSelector(p.ingredients || []); 
    if (modal) modal.classList.remove('hidden');
    refreshIcons();
}

function renderRecipeIngredientsSelector(recipeIngredients) {
    // 🌟 CORRECTIF ID : Réalignement sur l'ID de index.html (product-ingredients-composer)
    const container = document.getElementById('product-ingredients-composer') || document.getElementById('product-ingredients-selector');
    if (!container) return;
    
    if (!AppState.ingredients || AppState.ingredients.length === 0) { 
        container.innerHTML = `<p class="text-[11px] text-slate-500 text-center py-4">Créez d'abord des matières premières dans l'onglet dédié.</p>`; 
        return; 
    }
    
    container.innerHTML = AppState.ingredients.map(baseIng => {
        const match = recipeIngredients.find(x => x.id === baseIng.id);
        return `
            <div class="flex items-center justify-between gap-2 bg-slate-950/40 p-2 border border-slate-800/80 rounded-xl mb-1.5 last:mb-0">
                <label class="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                    <input type="checkbox" data-ing-id="${baseIng.id}" ${match ? 'checked' : ''} class="recipe-cb w-3.5 h-3.5 text-emerald-600 bg-slate-900 border-slate-800 rounded">
                    <span class="text-[11px] text-slate-200 truncate font-medium">${escapeHtml(baseIng.name)}</span>
                </label>
                <div class="flex items-center gap-1 shrink-0 ${match ? '' : 'opacity-30 pointer-events-none'}" data-row-id="${baseIng.id}">
                    <input type="number" inputmode="decimal" value="${match ? match.amount : ''}" placeholder="0" class="w-14 bg-slate-900 border border-slate-800 text-slate-100 rounded p-1 text-center font-mono text-[11px]">
                    <span class="text-[10px] text-slate-400 w-5 uppercase font-bold text-right">${baseIng.unit}</span>
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

async function saveProduct() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        showToast("Session expirée. Veuillez vous reconnecter.", "error");
        return;
    }

    const idField = document.getElementById('product-id-field') || document.getElementById('product-id');
    const nameField = document.getElementById('product-name');
    
    const id = idField ? idField.value : "";
    const name = nameField ? nameField.value.trim() : "";
    
    if (!name) { showToast("Le nom du produit est requis.", "error"); return; }
    
    const selectedIngredients = []; 
    let err = false;
    
    // Ajustement du sélecteur parent pour cibler le bon conteneur HTML
    const selectorContainerId = document.getElementById('product-ingredients-composer') ? '#product-ingredients-composer' : '#product-ingredients-selector';
    document.querySelectorAll(`${selectorContainerId} input[type="checkbox"]:checked`).forEach(cb => {
        const row = document.querySelector(`[data-row-id="${cb.dataset.ingId}"] input`);
        const amt = row ? parseFloat(row.value) : NaN;
        if (isNaN(amt) || amt <= 0) err = true; 
        else selectedIngredients.push({ id: cb.dataset.ingId, amount: amt });
    });
    
    if (err) { showToast("Veuillez saisir des quantités valides pour les matières cochées.", "error"); return; }

    const productPayload = {
        user_id: user.id,
        name: name,
        category: 'Général',
        price_override: id ? (AppState.products.find(x => x.id === id)?.sellingPrice || 0) : 0,
        tva: 10.00,
        components: selectedIngredients
    };

    try {
        if (id) {
            const { error } = await supabaseClient
                .from('products')
                .update(productPayload)
                .eq('id', id);

            if (error) throw error;

            const p = AppState.products.find(x => x.id === id); 
            if (p) { 
                p.name = name; 
                p.ingredients = selectedIngredients; 
            }
        } else {
            const { data, error } = await supabaseClient
                .from('products')
                .insert([productPayload])
                .select();

            if (error) throw error;

            if (data && data[0]) {
                const newProduct = {
                    id: data[0].id,
                    name: data[0].name,
                    ingredients: data[0].components,
                    sellingPrice: data[0].price_override || 0,
                    tva: data[0].tva || 10
                };
                AppState.products.push(newProduct);
            }
        }

        const modal = document.getElementById('modal-product') || document.getElementById('product-modal');
        if (modal) modal.classList.add('hidden'); 
        
        renderProducts(); 
        showToast("Fiche technique enregistrée !");

    } catch (err) {
        console.error("Erreur de sauvegarde produit Supabase :", err.message);
        showToast("Erreur lors de la sauvegarde.", "error");
    }
}

async function deleteProduct(id) {
    const p = AppState.products.find(x => x.id === id); 
    if (!p) return;
    
    const confirmed = await showConfirm(`Supprimer le produit "${p.name}" ?`);
    if (!confirmed) return;

    try {
        const { error } = await supabaseClient
            .from('products')
            .delete()
            .eq('id', id);

        if (error) throw error;
        
        AppState.products = AppState.products.filter(x => x.id !== id); 
        
        renderProducts(); 
        showToast("Produit supprimé !");

    } catch (err) {
        console.error("Erreur de suppression produit Supabase :", err.message);
        showToast("Impossible de supprimer le produit.", "error");
    }
}

function calculateCostPrice(product) {
    if (!product.ingredients || product.ingredients.length === 0) return 0;

    let totalCents = 0;

    product.ingredients.forEach(recipeIng => {
        const baseIng = AppState.ingredients.find(x => x.id === recipeIng.id);
        
        if (baseIng && baseIng.qty > 0) {
            const pricePerUnit = baseIng.price / baseIng.qty;
            totalCents += pricePerUnit * recipeIng.amount;
        }
    });

    return totalCents / 100;
}