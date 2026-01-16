
import { supabase, handleError } from './supabase.js';
import { generateWhatsAppLink } from './messages.js';

let rentalsList = [];

export async function renderRentals() {
    const container = document.getElementById('content-area');
    container.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-bold">Listagem de Aluguéis</h3>
            <div class="flex gap-2">
                 <button class="btn btn-outline text-xs" onclick="renderRentals()">Atualizar</button>
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
                </td>
            </tr>
        `;
        }).join('');

        // Expose viewRentalDetail globally so the inline onclick works (module scope issue workaround)
        window.viewRentalDetail = openRentalModal;

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

    // Active Logic
    if (rental.status === 'active') {
        if (end < today) return { label: 'Vencido', bg: '#fee2e2', color: '#dc2626' }; // Overdue
        if (end === today) return { label: 'Vence Hoje', bg: '#fef3c7', color: '#d97706' };
        return { label: 'Ativo', bg: '#d1fae5', color: '#059669' };
    }

    return { label: rental.status, bg: '#f3f4f6', color: '#000' };
}

async function openRentalModal(id) {
    const rental = rentalsList.find(r => r.id === id);
    if (!rental) return;

    const modal = document.getElementById('rental-modal');
    const content = document.getElementById('rental-detail-content');

    // Fetch items
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
            <h4 class="font-bold text-sm mb-2">Ações</h4>
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
                <i class="uil uil-whatsapp"></i> Enviar Mensagem
            </a>
        </div>
    `;

    modal.classList.add('open');

    window.updateStatus = updateRentalStatus;
}

async function updateRentalStatus(id, newStatus) {
    if (!confirm(`Mudar status para ${newStatus}?`)) return;
    try {
        const { error } = await supabase.from('rentals').update({ status: newStatus }).eq('id', id);
        if (error) throw error;

        // If completing, maybe restore stock? For MVP simplicity, stock was not decremented on rent, only checked availability.
        // If we want real stock control:
        // 1. Rent confirm -> decrement stock
        // 2. Return -> increment stock
        // For now, adhering to simpler requirements unless specified. "Fluxo automático" mentioned in user request. 

        document.getElementById('rental-modal').classList.remove('open');
        renderRentals(); // Refresh
    } catch (error) {
        handleError(error, 'Update Status');
    }
}
