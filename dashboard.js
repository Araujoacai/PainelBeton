
import { supabase, handleError, checkAuth } from './supabase.js';
import { logout } from './auth.js';
import { renderRentals, handleManualRentalSubmit, loadRentalTools, setupRentalForm } from './rentals.js';
import { renderClientsPage, handleClientSubmit } from './clients.js';

let currentUser = null;
let currentTab = 'overview';

// Logic to load Categories for Select
async function loadCategories() {
    try {
        const { data, error } = await supabase.from('categories').select('*');
        if (error) throw error;
        const select = document.getElementById('tool-category');
        select.innerHTML = data.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    } catch (e) { console.error(e); }
}

// Stats Logic
async function loadStats() {
    const container = document.getElementById('content-area');
    container.innerHTML = '<div class="text-center py-10"><div class="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full inline-block"></div></div>';

    try {
        // Fetch counts (parallel)
        const [
            { count: toolsCount },
            { count: activeRentalsCount },
            { count: overdueRentalsCount },
            { data: financials }
        ] = await Promise.all([
            supabase.from('tools').select('*', { count: 'exact', head: true }),
            supabase.from('rentals').select('*', { count: 'exact', head: true }).eq('status', 'active'),
            supabase.from('rentals').select('*', { count: 'exact', head: true }).eq('status', 'overdue'),
            supabase.from('rentals').select('total_price').neq('status', 'cancelled')
        ]);

        const totalRevenue = financials?.reduce((sum, r) => sum + (r.total_price || 0), 0) || 0;

        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div class="card p-6 border-l-4 border-blue-500 flex items-center justify-between">
                    <div>
                        <p class="text-sm text-gray-500 font-semibold mb-1">Aluguéis Ativos</p>
                        <h3 class="text-2xl font-bold text-gray-800">${activeRentalsCount || 0}</h3>
                    </div>
                    <i class="uil uil-confused text-3xl text-blue-200"></i>
                </div>
                <div class="card p-6 border-l-4 border-red-500 flex items-center justify-between">
                    <div>
                        <p class="text-sm text-gray-500 font-semibold mb-1">Em Atraso</p>
                        <h3 class="text-2xl font-bold text-gray-800">${overdueRentalsCount || 0}</h3>
                    </div>
                    <i class="uil uil-exclamation-triangle text-3xl text-red-200"></i>
                </div>
                <div class="card p-6 border-l-4 border-green-500 flex items-center justify-between">
                    <div>
                        <p class="text-sm text-gray-500 font-semibold mb-1">Faturamento Total</p>
                        <h3 class="text-2xl font-bold text-gray-800">R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                    </div>
                    <i class="uil uil-bill text-3xl text-green-200"></i>
                </div>
                <div class="card p-6 border-l-4 border-purple-500 flex items-center justify-between">
                    <div>
                        <p class="text-sm text-gray-500 font-semibold mb-1">Ferramentas</p>
                        <h3 class="text-2xl font-bold text-gray-800">${toolsCount || 0}</h3>
                    </div>
                    <i class="uil uil-drill text-3xl text-purple-200"></i>
                </div>
            </div>

            <!-- Recent Activity Table could go here -->
            <div class="card p-6">
                 <h3 class="font-bold text-lg mb-4">Atalhos Rápidos</h3>
                 <div class="flex gap-4">
                    <button class="btn btn-primary" onclick="window.document.querySelector('[data-tab=tools]').click()">Gerenciar Ferramentas</button>
                    <button class="btn btn-outline" onclick="window.document.querySelector('[data-tab=rentals]').click()">Ver Aluguéis</button>
                 </div>
            </div>
        `;

    } catch (error) {
        handleError(error, 'Loading Stats');
    }
}

// Tools Logic
let toolsList = [];
async function renderToolsPage() {
    const container = document.getElementById('content-area');
    container.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-bold">Gerenciar Ferramentas</h3>
            <button id="add-tool-btn" class="btn btn-success text-white">
                <i class="uil uil-plus"></i> Nova Ferramenta
            </button>
        </div>
        
        <div class="bg-white rounded-lg shadow overflow-hidden">
            <table class="w-full text-left border-collapse">
                <thead class="bg-gray-50 border-b border-gray-200">
                    <tr>
                        <th class="p-4 text-xs font-semibold text-gray-500 uppercase">Imagem</th>
                        <th class="p-4 text-xs font-semibold text-gray-500 uppercase">Nome</th>
                        <th class="p-4 text-xs font-semibold text-gray-500 uppercase">Categoria</th>
                        <th class="p-4 text-xs font-semibold text-gray-500 uppercase">Preço/Dia</th>
                        <th class="p-4 text-xs font-semibold text-gray-500 uppercase">Estoque</th>
                        <th class="p-4 text-xs font-semibold text-gray-500 uppercase">Ações</th>
                    </tr>
                </thead>
                <tbody id="tools-table-body" class="divide-y divide-gray-100">
                    <tr><td colspan="6" class="p-4 text-center">Carregando...</td></tr>
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('add-tool-btn').addEventListener('click', () => openToolModal());
    await fetchAndRenderToolsTable();
}

async function fetchAndRenderToolsTable() {
    const tbody = document.getElementById('tools-table-body');
    try {
        const { data, error } = await supabase.from('tools').select('*, categories(name)').order('created_at', { ascending: false });
        if (error) throw error;
        toolsList = data;

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-muted">Nenhuma ferramenta cadastrada.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(tool => `
            <tr class="hover:bg-gray-50">
                <td class="p-3">
                    <img src="${tool.image_url || 'https://placehold.co/40'}" class="w-10 h-10 rounded object-cover border border-gray-200">
                </td>
                <td class="p-3 font-medium text-gray-800">${tool.name}</td>
                <td class="p-3 text-sm text-gray-600">${tool.categories?.name || '-'}</td>
                <td class="p-3 text-sm text-gray-600">R$ ${parseFloat(tool.price_per_day).toFixed(2)}</td>
                <td class="p-3">
                    <span class="badge ${tool.stock_available > 0 ? 'badge-success' : 'badge-danger'}">
                        ${tool.stock_available} / ${tool.stock_total}
                    </span>
                </td>
                <td class="p-3 flex gap-2">
                    <button class="text-blue-500 hover:text-blue-700 edit-tool-btn" data-id="${tool.id}"><i class="uil uil-edit"></i></button>
                    <button class="text-red-500 hover:text-red-700 delete-tool-btn" data-id="${tool.id}"><i class="uil uil-trash-alt"></i></button>
                </td>
            </tr>
        `).join('');

        // Attach listeners
        document.querySelectorAll('.edit-tool-btn').forEach(btn => btn.addEventListener('click', (e) => openToolModal(e.currentTarget.dataset.id)));
        document.querySelectorAll('.delete-tool-btn').forEach(btn => btn.addEventListener('click', (e) => deleteTool(e.currentTarget.dataset.id)));

    } catch (error) {
        handleError(error, 'Tools Table');
    }
}

// Tool Modal Logic
const toolModal = document.getElementById('tool-modal');
const toolForm = document.getElementById('tool-form');

function openToolModal(id = null) {
    toolForm.reset();
    document.getElementById('tool-id').value = '';

    if (id) {
        const tool = toolsList.find(t => t.id === id);
        if (tool) {
            document.getElementById('tool-id').value = tool.id;
            document.getElementById('tool-name').value = tool.name;
            document.getElementById('tool-category').value = tool.category_id;
            document.getElementById('tool-price').value = tool.price_per_day;
            document.getElementById('tool-stock').value = tool.stock_total;
            document.getElementById('tool-image-url').value = tool.image_url || '';
            document.getElementById('tool-modal-title').textContent = 'Editar Ferramenta';
        }
    } else {
        document.getElementById('tool-modal-title').textContent = 'Nova Ferramenta';
    }

    toolModal.classList.add('open');
}

// Handle Form Submit
toolForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('tool-id').value;
    const name = document.getElementById('tool-name').value;
    const category_id = document.getElementById('tool-category').value;
    const price_per_day = parseFloat(document.getElementById('tool-price').value);
    const stock_total = parseInt(document.getElementById('tool-stock').value);
    let image_url = document.getElementById('tool-image-url').value;
    const fileInput = document.getElementById('tool-image-file');

    const btn = toolForm.querySelector('button[type="submit"]');
    const originalText = btn.innerText;
    btn.innerText = 'Salvando...';
    btn.disabled = true;

    try {
        // Handle File Upload
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { data, error: uploadError } = await supabase.storage
                .from('tools')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('tools')
                .getPublicUrl(filePath);

            image_url = publicUrl;
        }

        const payload = {
            name, category_id, price_per_day, stock_total, image_url
        };
        if (!id) payload.stock_available = stock_total;

        if (id) {
            const { error } = await supabase.from('tools').update(payload).eq('id', id);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('tools').insert([payload]);
            if (error) throw error;
        }
        toolModal.classList.remove('open');
        fetchAndRenderToolsTable();
    } catch (error) {
        handleError(error, 'Saving Tool');
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
});

async function deleteTool(id) {
    if (!confirm('Tem certeza que deseja excluir esta ferramenta?')) return;
    try {
        const { error } = await supabase.from('tools').delete().eq('id', id);
        if (error) throw error;
        fetchAndRenderToolsTable();
    } catch (error) {
        handleError(error, 'Deleting Tool');
    }
}


// Navigation
function setupNavigation() {
    const links = document.querySelectorAll('.sidebar-link[data-tab]');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            // Active state
            links.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Content
            const tab = link.dataset.tab;
            currentTab = tab;
            document.getElementById('page-title').textContent = link.innerText.trim();

            if (tab === 'overview') loadStats();
            else if (tab === 'rentals') renderRentals();
            else if (tab === 'tools') renderToolsPage();
            else if (tab === 'clients') renderClientsPage();
            else document.getElementById('content-area').innerHTML = '<p class="text-muted">Em desenvolvimento...</p>';
        });
    });

    // Modals Close
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
        });
    });

    document.getElementById('logout-btn').addEventListener('click', logout);

    // Form handlers
    document.getElementById('client-form').addEventListener('submit', handleClientSubmit);
    document.getElementById('manual-rental-form').addEventListener('submit', handleManualRentalSubmit);

    // Init Rental Form logic (listeners for calc)
    setupRentalForm();
}

// Init
async function init() {
    currentUser = await checkAuth();
    if (currentUser) {
        setupNavigation();
        await loadCategories();
        await loadRentalTools(); // Preload tools for rental form
        loadStats(); // Default
    }
}

init();
