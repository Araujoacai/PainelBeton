
import { supabase, handleError } from './supabase.js';
import { generateWhatsAppLink } from './messages.js';

let rentalsList = [];
let allTools = [];
let selectedRentalItems = [];
let clientsListForSelect = [];

export async function renderRentals() {
    const container = document.getElementById('content-area');
    container.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-bold">Listagem de Aluguéis</h3>
            <div class="flex gap-2">
                 <button id="new-rental-btn" class="btn btn-success text-white"><i class="uil uil-plus"></i> Novo Aluguel</button>
                 <button class="btn btn-outline text-xs" onclick="renderRentals()"><i class="uil uil-refresh"></i></button>
            </div>
        </div>
        
        <div class="bg-white rounded-lg shadow overflow-hidden">
            <table class="w-full text-left border-collapse">
                <thead class="bg-gray-50 border-b border-gray-200">
                    <tr>
                        <th class="p-4 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                        <th class="p-4 text-xs font-semibold text-gray-500 uppercase">Período</th>
                        <th class="p-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                        <th class="p-4 text-xs font-semibold text-gray-500 uppercase">Total</th>
                        <th class="p-4 text-xs font-semibold text-gray-500 uppercase">Ações</th>
                    </tr>
                </thead>
                <tbody id="rentals-table-body" class="divide-y divide-gray-100">
                    <tr><td colspan="5" class="p-4 text-center">Carregando...</td></tr>
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('new-rental-btn').addEventListener('click', openManualRentalModal);
    await fetchAndRenderRentalsTable();
}

async function fetchAndRenderRentalsTable() {
    const tbody = document.getElementById('rentals-table-body');
    try {
        const { data, error } = await supabase
            .from('rentals')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        rentalsList = data;

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-muted">Nenhum aluguel encontrado.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(r => {
            const statusConfig = getStatusConfig(r);
            return `
            <tr class="hover:bg-gray-50 cursor-pointer" onclick="window.viewRentalDetail('${r.id}')">
                <td class="p-3">
                    <div class="font-medium text-gray-800">${r.customer_name}</div>
                    <div class="text-xs text-muted">${r.customer_phone}</div>
                </td>
                <td class="p-3 text-sm text-gray-600">
                    ${new Date(r.start_date).toLocaleDateString()} - ${new Date(r.end_date).toLocaleDateString()}
                    <div class="text-xs text-muted">${r.total_days} dias</div>
                </td>
                <td class="p-3">
                    <span class="badge" style="background-color: ${statusConfig.bg}; color: ${statusConfig.color}">
                        ${statusConfig.label}
                    </span>
                </td>
                <td class="p-3 font-semibold text-gray-800">R$ ${r.total_price}</td>
                <td class="p-3">
                     <button class="btn btn-outline py-1 px-2 text-xs">Ver</button>
                     <button class="btn btn-primary py-1 px-2 text-xs ml-2" onclick="window.editRental('${r.id}', event)"><i class="uil uil-edit"></i></button>
                </td>
            </tr>
        `;
        }).join('');

        window.viewRentalDetail = openRentalDetailModal;
        window.editRental = (id, e) => {
            e.stopPropagation(); // prevent opening detail modal
            openManualRentalModal(id);
        }

    } catch (error) {
        handleError(error, 'Rentals Table');
    }
}

function getStatusConfig(rental) {
    const today = new Date().toISOString().split('T')[0];
    const end = rental.end_date;

    if (rental.status === 'completed') return { label: 'Finalizado', bg: '#f3f4f6', color: '#1f2937' };
    if (rental.status === 'cancelled') return { label: 'Cancelado', bg: '#fef2f2', color: '#991b1b' };
    if (rental.status === 'pending') return { label: 'Pendente', bg: '#eff6ff', color: '#1e40af' };

    if (rental.status === 'active') {
        if (end < today) return { label: 'Vencido', bg: '#fee2e2', color: '#dc2626' };
        if (end === today) return { label: 'Vence Hoje', bg: '#fef3c7', color: '#d97706' };
        return { label: 'Ativo', bg: '#d1fae5', color: '#059669' };
    }

    return { label: rental.status, bg: '#f3f4f6', color: '#000' };
}

// --- Detail View ONLY ---
async function openRentalDetailModal(id) {
    const rental = rentalsList.find(r => r.id === id);
    if (!rental) return;

    const modal = document.getElementById('rental-modal');
    const content = document.getElementById('rental-detail-content');

    const { data: items } = await supabase.from('rental_items').select('*, tools(name)').eq('rental_id', id);

    content.innerHTML = `
        <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
                <p class="text-sm text-muted">Cliente</p>
                <p class="font-bold">${rental.customer_name}</p>
                <p class="text-sm">${rental.customer_phone}</p>
            </div>
            <div class="text-right">
                <p class="text-sm text-muted">Status</p>
                <span class="font-bold uppercase">${rental.status}</span>
            </div>
        </div>

        <div class="mb-4">
            <h4 class="font-bold text-sm border-b pb-2 mb-2">Itens Alugados</h4>
            <ul class="space-y-1 text-sm">
                ${items ? items.map(i => `<li class="flex justify-between"><span>${i.tools?.name || 'Ferramenta'} (x${i.quantity})</span> <span>R$ ${i.price_at_rental}</span></li>`).join('') : 'Carregando itens...'}
            </ul>
        </div>

        <div class="flex flex-col gap-2 mt-6 pt-4 border-t">
            <h4 class="font-bold text-sm mb-2">Ações Rápidas</h4>
            <div class="grid grid-cols-2 gap-2">
                ${rental.status === 'pending' ? `
                    <button class="btn btn-success text-white w-full" onclick="window.updateStatus('${id}', 'active')">Confirmar Aluguel</button>
                    <button class="btn btn-danger text-white w-full" onclick="window.updateStatus('${id}', 'cancelled')">Cancelar</button>
                ` : ''}
                
                ${rental.status === 'active' ? `
                    <button class="btn btn-secondary text-white w-full" onclick="window.updateStatus('${id}', 'completed')">Marcar Devolução</button>
                ` : ''}
            </div>
            
            <a href="${generateWhatsAppLink(rental, 'manual')}" target="_blank" class="btn btn-outline w-full flex items-center justify-center gap-2">
                <i class="uil uil-whatsapp"></i> Enviar Msg WhatsApp
            </a>
        </div>
    `;

    modal.classList.add('open');
    window.updateStatus = updateRentalStatus;
}


// --- Manual Rental / Edit Logic ---

export async function loadRentalTools() {
    const { data } = await supabase.from('tools').select('id, name, price_per_day').order('name');
    allTools = data || [];

    // Also load clients for select
    const { data: clients } = await supabase.from('clients').select('id, name, phone').order('name');
    clientsListForSelect = clients || [];

    // Populate Tool Selector
    const toolSelect = document.getElementById('tool-selector');
    toolSelect.innerHTML = `<option value="">Adicionar ferramenta...</option>` +
        allTools.map(t => `<option value="${t.id}" data-price="${t.price_per_day}">${t.name} (R$ ${t.price_per_day})</option>`).join('');

    // Populate Client Selector
    const clientSelect = document.getElementById('rental-client-select');
    clientSelect.innerHTML = `<option value="">Selecione um cliente...</option>` +
        clientsListForSelect.map(c => `<option value="${c.id}" data-name="${c.name}" data-phone="${c.phone}">${c.name}</option>`).join('');
}

export function setupRentalForm() {
    document.getElementById('add-item-btn').addEventListener('click', addToolToRentalList);

    // Recalc total on date change
    document.getElementById('rental-start-date').addEventListener('change', calculateRentalTotal);
    document.getElementById('rental-end-date').addEventListener('change', calculateRentalTotal);
}

function addToolToRentalList() {
    const select = document.getElementById('tool-selector');
    const toolId = select.value;
    if (!toolId) return;

    const toolName = select.options[select.selectedIndex].text;
    const price = parseFloat(select.options[select.selectedIndex].dataset.price);
    const qty = parseInt(document.getElementById('tool-quantity').value);

    // Check if exists
    const existing = selectedRentalItems.find(i => i.tool_id === toolId);
    if (existing) {
        existing.quantity += qty;
    } else {
        selectedRentalItems.push({ tool_id: toolId, name: toolName, price_at_rental: price, quantity: qty });
    }

    renderRentalItems();
    calculateRentalTotal();
}

function renderRentalItems() {
    const list = document.getElementById('rental-items-list');
    list.innerHTML = selectedRentalItems.map((item, index) => `
        <tr class="border-b border-gray-100">
            <td class="py-2">${item.name}</td>
            <td class="py-2">${item.quantity}</td>
            <td class="py-2">R$ ${item.price_at_rental}</td>
            <td class="py-2 text-right">
                <button type="button" class="text-red-500 hover:text-red-700" onclick="window.removeRentalItem(${index})"><i class="uil uil-trash"></i></button>
            </td>
        </tr>
    `).join('');

    window.removeRentalItem = (idx) => {
        selectedRentalItems.splice(idx, 1);
        renderRentalItems();
        calculateRentalTotal();
    };
}

function calculateRentalTotal() {
    const start = document.getElementById('rental-start-date').value;
    const end = document.getElementById('rental-end-date').value;

    if (!start || !end) return;

    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate - startDate);
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1; // Min 1 day

    let itemsTotal = selectedRentalItems.reduce((acc, item) => acc + (item.price_at_rental * item.quantity), 0);
    let total = itemsTotal * days;

    document.getElementById('rental-total-display').innerText = `R$ ${total.toFixed(2)}`;
    return { total, days };
}

async function openManualRentalModal(id = null) {
    const modal = document.getElementById('manual-rental-modal');
    const form = document.getElementById('manual-rental-form');

    form.reset();
    document.getElementById('manual-rental-id').value = '';
    selectedRentalItems = [];
    document.getElementById('rental-total-display').innerText = 'R$ 0,00';
    renderRentalItems();

    // Reload clients/tools to be fresh
    await loadRentalTools();

    if (id) {
        // Edit Mode
        const rental = rentalsList.find(r => r.id === id);
        if (rental) {
            document.getElementById('manual-rental-id').value = rental.id;

            // NOTE: We don't have client_id in rentals table yet (per schema), so we might fail to match select if we rely on ID.
            // But we stored customer_name. We will try to match name for now, or just leave blank if custom string.
            // Ideally we migrate rentals to have client_id. For now, let's try to match by name in select logic:
            const clientMatch = clientsListForSelect.find(c => c.name === rental.customer_name);
            if (clientMatch) document.getElementById('rental-client-select').value = clientMatch.id;

            document.getElementById('rental-status-select').value = rental.status;
            document.getElementById('rental-start-date').value = rental.start_date;
            document.getElementById('rental-end-date').value = rental.end_date;

            // Fetch items again
            const { data: items } = await supabase.from('rental_items').select('*, tools(name, price_per_day)').eq('rental_id', id);
            selectedRentalItems = items.map(i => ({
                tool_id: i.tool_id,
                name: i.tools?.name,
                price_at_rental: i.price_at_rental,
                quantity: i.quantity
            }));
            renderRentalItems();
            calculateRentalTotal();

            document.getElementById('manual-rental-title').innerText = 'Editar Aluguel';
        }
    } else {
        document.getElementById('manual-rental-title').innerText = 'Novo Aluguel Manual';
    }

    modal.classList.add('open');
}

export async function handleManualRentalSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('manual-rental-id').value;
    const clientSelect = document.getElementById('rental-client-select');
    const selectedOption = clientSelect.options[clientSelect.selectedIndex];

    if (!clientSelect.value) {
        alert('Por favor selecione um cliente.');
        return;
    }

    const customer_name = selectedOption.dataset.name;
    const customer_phone = selectedOption.dataset.phone;

    const start_date = document.getElementById('rental-start-date').value;
    const end_date = document.getElementById('rental-end-date').value;
    const status = document.getElementById('rental-status-select').value;

    const { total, days } = calculateRentalTotal();

    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerText;
    btn.innerText = 'Salvando...';
    btn.disabled = true;

    try {
        if (selectedRentalItems.length === 0) throw new Error('Adicione pelo menos uma ferramenta.');

        const rentalPayload = {
            customer_name,
            customer_phone,
            start_date,
            end_date,
            total_days: days,
            total_price: total,
            status
        };

        let rentalId = id;

        if (id) {
            // Update
            const { error } = await supabase.from('rentals').update(rentalPayload).eq('id', id);
            if (error) throw error;

            // Delete old items (easier than diffing)
            await supabase.from('rental_items').delete().eq('rental_id', id);
        } else {
            // Insert
            const { data, error } = await supabase.from('rentals').insert([rentalPayload]).select();
            if (error) throw error;
            rentalId = data[0].id;
        }

        // Insert Items
        const itemsPayload = selectedRentalItems.map(i => ({
            rental_id: rentalId,
            tool_id: i.tool_id,
            quantity: i.quantity,
            price_at_rental: i.price_at_rental
        }));

        const { error: itemsError } = await supabase.from('rental_items').insert(itemsPayload);
        if (itemsError) throw itemsError;

        document.getElementById('manual-rental-modal').classList.remove('open');
        renderRentals();

    } catch (error) {
        handleError(error, 'Saving Rental');
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}


async function updateRentalStatus(id, newStatus) {
    if (!confirm(`Mudar status para ${newStatus}?`)) return;
    try {
        const { error } = await supabase.from('rentals').update({ status: newStatus }).eq('id', id);
        if (error) throw error;
        document.getElementById('rental-modal').classList.remove('open');
        renderRentals();
    } catch (error) {
        handleError(error, 'Update Status');
    }
}
