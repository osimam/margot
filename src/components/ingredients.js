import { AppState } from '../store/appState.js';
import { PriceUtils, escapeHtml } from '../utils/priceUtils.js';
import { showToast, showConfirm, refreshIcons } from '../main.js';

export function initIngredientsEvents() {
    const btnAdd = document.getElementById('btn-add-ingredient');
    const btnCancel = document.getElementById('btn-cancel-ingredient');
    const btnSave = document.getElementById('btn-save-ingredient');

    if (btnAdd) btnAdd.addEventListener('click', openAddIngredientModal);
    if (btnCancel) btnCancel.addEventListener('click', () => {
        const modal = document.getElementById('modal-ingredient');
        if (modal) modal.classList.add('hidden');
    });
    if (btnSave) btnSave.addEventListener('click', saveIngredient);
}

export function renderIngredients() {
    const list = document.getElementById('ingredients-list');
    if (!list) return;

    if (!AppState.ingredients || AppState.ingredients.length === 0) {
        list.innerHTML = `<div class="text-center py-8 text-xs text-slate-500 italic bg-slate-900 border border-dashed border-slate-800 rounded-2xl">Aucune matière première.</div>`;
        return;
    }

    list.innerHTML = AppState.ingredients.map(ing => `
        <div class="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex justify-between items-center hover:border-slate-700 transition shadow-sm">
            <div class="space-y-0.5 min-w-0 flex-1">
                <h3 class="font-bold text-xs text-slate-200 tracking-wide truncate">${escapeHtml(ing.name)}</h3>
                <p class="text-[11px] text-slate-400 font-mono">
                    <span class="text-emerald-400 font-bold">${PriceUtils.toEurosString(ing.price)} €</span> pour ${ing.qty} ${ing.unit}
                </p>
            </div>
            <div class="flex gap-1.5 shrink-0 ml-4">
                <button data-id="${ing.id}" class="edit-ing-btn p-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl cursor-pointer hover:text-emerald-400 hover:border-slate-600 transition" title="Modifier la matière">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                </button>
                <button data-id="${ing.id}" class="del-ing-btn p-2 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl cursor-pointer hover:text-rose-400 hover:border-rose-500 transition" title="Supprimer la matière">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                </button>
            </div>
        </div>
    `).join('');

    // Assignation propre des clics
    list.querySelectorAll('.edit-ing-btn').forEach(btn => {
        btn.addEventListener('click', () => openEditIngredientModal(btn.dataset.id));
    });
    list.querySelectorAll('.del-ing-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteIngredient(btn.dataset.id));
    });

    refreshIcons();
}

function openAddIngredientModal() {
    const modal = document.getElementById('modal-ingredient');
    const title = document.getElementById('modal-ingredient-title');
    
    if (title) title.innerHTML = `<i data-lucide="plus-circle" class="text-emerald-400 w-5 h-5"></i>Nouvelle Matière`;
    
    document.getElementById('ing-id-field').value = ""; 
    document.getElementById('ing-name').value = "";
    document.getElementById('ing-price').value = ""; 
    document.getElementById('ing-qty').value = "1";
    document.getElementById('ing-unit').value = "kg"; // Valeur par défaut cohérente
    
    if (modal) modal.classList.remove('hidden');
    refreshIcons();
}

function openEditIngredientModal(id) {
    const ing = AppState.ingredients.find(x => x.id === id); 
    if (!ing) return;

    const modal = document.getElementById('modal-ingredient');
    const title = document.getElementById('modal-ingredient-title');
    
    if (title) title.innerHTML = `<i data-lucide="edit" class="text-emerald-400 w-5 h-5"></i>Modifier la Matière`;
    
    document.getElementById('ing-id-field').value = ing.id; 
    document.getElementById('ing-name').value = ing.name;
    
    // Conversion sécurisée en cas de prix stocké en centimes
    document.getElementById('ing-price').value = typeof PriceUtils.toEurosFloat === 'function' ? PriceUtils.toEurosFloat(ing.price) : (ing.price / 100); 
    document.getElementById('ing-qty').value = ing.qty; 
    document.getElementById('ing-unit').value = ing.unit;
    
    if (modal) modal.classList.remove('hidden');
    refreshIcons();
}

function saveIngredient() {
    const id = document.getElementById('ing-id-field').value;
    const name = document.getElementById('ing-name').value.trim();
    
    // Nettoyage de la saisie utilisateur (remplacement automatique de la virgule par un point)
    const priceRaw = document.getElementById('ing-price').value.replace(',', '.');
    const qty = parseFloat(document.getElementById('ing-qty').value);
    const unit = document.getElementById('ing-unit').value;

    if (!name) { showToast("Le nom de la matière est requis.", "error"); return; }
    if (isNaN(qty) || qty <= 0) { showToast("Veuillez saisir une quantité de référence valide.", "error"); return; }
    if (isNaN(parseFloat(priceRaw)) || parseFloat(priceRaw) < 0) { showToast("Veuillez saisir un prix valide.", "error"); return; }

    const priceInCents = PriceUtils.toCents(priceRaw);

    if (id) {
        // Mode Modification
        const ing = AppState.ingredients.find(x => x.id === id);
        if (ing) { 
            ing.name = name; 
            ing.price = priceInCents; 
            ing.qty = qty; 
            ing.unit = unit; 
        }
    } else {
        // Mode Création (ID natif isolé)
        const newId = 'i_' + Math.random().toString(36).substr(2, 9);
        AppState.ingredients.push({ id: newId, name, price: priceInCents, qty, unit });
    }

    // Sauvegarde immédiate synchronisée localement
    localStorage.setItem('margot_ingredients', JSON.stringify(AppState.ingredients));
    
    const modal = document.getElementById('modal-ingredient');
    if (modal) modal.classList.add('hidden');
    
    renderIngredients(); 
    showToast("Matière enregistrée avec succès !");
}

async function deleteIngredient(id) {
    const ing = AppState.ingredients.find(x => x.id === id); 
    if (!ing) return;
    
    const confirmed = await showConfirm(`Supprimer la matière "${ing.name}" ?\nElle sera retirée de vos fiches techniques associées.`);
    if (!confirmed) return;
    
    // Filtrage et nettoyage automatique
    AppState.ingredients = AppState.ingredients.filter(x => x.id !== id);
    localStorage.setItem('margot_ingredients', JSON.stringify(AppState.ingredients));

    // Nettoyage cascade : retire la référence de cette matière dans toutes les recettes existantes
    if (AppState.products) {
        AppState.products.forEach(p => { 
            if (p.ingredients) p.ingredients = p.ingredients.filter(i => i.id !== id); 
        });
        localStorage.setItem('margot_products', JSON.stringify(AppState.products));
    }
    
    renderIngredients(); 
    showToast("Matière supprimée");
}