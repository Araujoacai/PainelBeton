import { supabase, handleError } from './supabase.js';

let clientsList = [];

export async function renderClientsPage() {
    const container = document.getElementById('content-area');
    container.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-bold">Gerenciar Clientes</h3>
            <button id="add-client-btn" class="btn btn-primary text-white">
                <i class="uil uil-plus"></i> Novo Cliente
            </button>
        </div>
        
        <div class="bg-white rounded-lg shadow overflow-hidden">
            <table class="w-full text-left border-collapse">
                <thead class="bg-gray-50 border-b border-gray-200">
                    <tr>
                        <th class="p-4 text-xs font-semibold text-gray-500 uppercase">Nome</th>
                        <th class="p-4 text-xs font-semibold text-gray-500 uppercase">Telefone</th>
                        <th class="p-4 text-xs font-semibold text-gray-500 uppercase">Email</th>
                        <th class="p-4 text-xs font-semibold text-gray-500 uppercase">Ações</th>
                    </tr>
                </thead>
                <tbody id="clients-table-body" class="divide-y divide-gray-100">
                    <tr><td colspan="4" class="p-4 text-center">Carregando...</td></tr>
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('add-client-btn').addEventListener('click', () => openClientModal());
    await fetchAndRenderClientsTable();
}

async function fetchAndRenderClientsTable() {
    const tbody = document.getElementById('clients-table-body');
    try {
        const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        clientsList = data;

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-muted">Nenhum cliente cadastrado.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(client => `
            <tr class="hover:bg-gray-50">
                <td class="p-3 font-medium text-gray-800">${client.name}</td>
                <td class="p-3 text-sm text-gray-600">${client.phone || '-'}</td>
                <td class="p-3 text-sm text-gray-600">${client.email || '-'}</td>
                <td class="p-3 flex gap-2">
                    <button class="text-blue-500 hover:text-blue-700 edit-client-btn" data-id="${client.id}"><i class="uil uil-edit"></i></button>
                    <button class="text-red-500 hover:text-red-700 delete-client-btn" data-id="${client.id}"><i class="uil uil-trash-alt"></i></button>
                </td>
            </tr>
        `).join('');

        document.querySelectorAll('.edit-client-btn').forEach(btn => btn.addEventListener('click', (e) => openClientModal(e.currentTarget.dataset.id)));
        document.querySelectorAll('.delete-client-btn').forEach(btn => btn.addEventListener('click', (e) => deleteClient(e.currentTarget.dataset.id)));

    } catch (error) {
        handleError(error, 'Clients Table');
    }
}

// Global modal reference (assuming it's in dashboard.html or we create it dynamically)
// For simplicity, we'll expect the modal to exist in dashboard.html, similar to tool-modal
function openClientModal(id = null) {
    const modal = document.getElementById('client-modal');
    const form = document.getElementById('client-form');

    // Reset form
    form.reset();
    document.getElementById('client-id').value = '';

    if (id) {
        const client = clientsList.find(c => c.id === id);
        if (client) {
            document.getElementById('client-id').value = client.id;
            document.getElementById('client-name').value = client.name;
            document.getElementById('client-phone').value = client.phone || '';
            document.getElementById('client-email').value = client.email || '';
            document.getElementById('client-address').value = client.address || '';
            document.getElementById('client-modal-title').textContent = 'Editar Cliente';
        }
    } else {
        document.getElementById('client-modal-title').textContent = 'Novo Cliente';
    }

    modal.classList.add('open');
}

export async function handleClientSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.innerText;

    btn.innerText = 'Salvando...';
    btn.disabled = true;

    try {
        const id = document.getElementById('client-id').value;
        const name = document.getElementById('client-name').value;
        const phone = document.getElementById('client-phone').value;
        const email = document.getElementById('client-email').value;
        const address = document.getElementById('client-address').value;

        const payload = { name, phone, email, address };

        if (id) {
            const { error } = await supabase.from('clients').update(payload).eq('id', id);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('clients').insert([payload]);
            if (error) throw error;
        }

        document.getElementById('client-modal').classList.remove('open');
        fetchAndRenderClientsTable();

    } catch (error) {
        handleError(error, 'Saving Client');
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

async function deleteClient(id) {
    if (!confirm('Tem certeza? Isso pode afetar históricos de aluguel.')) return;
    try {
        const { error } = await supabase.from('clients').delete().eq('id', id);
        if (error) throw error;
        fetchAndRenderClientsTable();
    } catch (error) {
        handleError(error, 'Deleting Client');
    }
}
