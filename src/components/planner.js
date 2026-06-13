import { AppState } from '../store/appState.js';
import { PriceUtils, escapeHtml } from '../utils/priceUtils.js';

export function initPlannerEvents() {
    document.getElementById('btn-generate-shopping').addEventListener('click', generateShoppingList);
    document.getElementById('btn-export-pdf').addEventListener('click', () => window.print());
    document.getElementById('btn-export-csv').addEventListener('click', exportToSheets);
}

export function populatePlannerInputs() {
    const container = document.getElementById('planner-products-inputs');
    if (AppState.products.length === 0) {
        container.innerHTML = `<div class="text-center py-6 text-xs text-slate-500 italic">Aucun produit disponible.</div>`;
        document.getElementById('btn-generate-shopping').classList.add('hidden'); return;
    }
    document.getElementById('btn-generate-shopping').classList.remove('hidden');
    container.innerHTML = AppState.products.map(p => `
        <div class="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex justify-between items-center hover:border-slate-700 transition">
            <label for="plan-vol-${p.id}" class="text-xs font-bold text-slate-200 tracking-wide flex-1 pr-2 truncate">${escapeHtml(p.name)}</label>
            <div class="flex items-center gap-2 shrink-0"><span class="text-[10px] text-slate-500 font-bold uppercase">Volume :</span><input type="number" min="0" id="plan-vol-${p.id}" placeholder="0" class="w-16 bg-slate-950 border border-slate-700 text-slate-100 font-bold rounded-xl p-2 text-center text-xs font-mono"></div>
        </div>
    `).join('');
}

function generateShoppingList() {
    const reqMap = {};
    AppState.products.forEach(p => {
        const vol = parseInt(document.getElementById(`plan-vol-${p.id}`)?.value || 0);
        if (isNaN(vol) || vol <= 0) return;
        p.ingredients.forEach(pIng => { reqMap[pIng.id] = (reqMap[pIng.id] || 0) + (pIng.amount * vol); });
    });

    const itemsUl = document.getElementById('shopping-items'); itemsUl.innerHTML = "";
    const entries = Object.entries(reqMap);
    if (entries.length === 0) return alert("Saisissez un volume.");

    let overallCents = 0;
    entries.forEach(([ingId, amt]) => {
        const base = AppState.ingredients.find(x => x.id === ingId); if (!base) return;
        const cost = base.qty > 0 ? Math.round((base.price * amt) / base.qty) : 0; overallCents += cost;
        const li = document.createElement('li');
        li.className = "bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 flex justify-between items-center text-xs text-slate-200";
        li.innerHTML = `<div><span class="font-bold text-slate-100">${escapeHtml(base.name)}</span><p class="text-[10px] text-slate-500 font-bold uppercase">Quantité : <b class="text-emerald-400 font-mono">${amt.toFixed(2)}</b> ${base.unit}</p></div><span class="font-mono font-bold text-amber-400">${PriceUtils.toEurosString(cost)} €</span>`;
        itemsUl.appendChild(li);
    });

    const summary = document.createElement('li');
    summary.className = "mt-4 bg-slate-900 border border-emerald-500/20 rounded-xl p-4 flex justify-between items-center text-xs font-bold";
    summary.innerHTML = `<span class="text-emerald-400 uppercase tracking-wider text-[11px]">Budget Global :</span><span class="font-mono text-base font-black text-emerald-400">${PriceUtils.toEurosString(overallCents)} €</span>`;
    itemsUl.appendChild(summary);
    document.getElementById('shopping-list-result').classList.remove('hidden');
}

function exportToSheets() {
    let csv = "Matiere Premiere,Quantite Requise,Unite,Estimation Cout (€)\n";
    document.querySelectorAll('#shopping-items li').forEach(li => {
        const name = li.querySelector('.font-bold')?.textContent;
        const qty = li.querySelector('b')?.textContent;
        const cost = li.querySelector('.font-mono')?.textContent.replace(' €', '');
        if (name && qty) csv += `"${name}",${qty},,${cost}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `margot_achats.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
}