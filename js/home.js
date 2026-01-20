
import { supabase, handleError, escapeHtml } from './supabase.js';
import { addToCart } from './cart.js';

let allTools = [];
let categories = [];
let currentCategory = 'all';
let searchQuery = '';

// DOM Elements
const grid = document.getElementById('tools-grid');
const categoriesContainer = document.getElementById('categories-container');
const searchInput = document.getElementById('search-input');

// Initialize
async function init() {
    await fetchCategories();
    await fetchTools();
    setupEventListeners();
}

async function fetchCategories() {
    try {
        const { data, error } = await supabase.from('categories').select('*').order('name');
        if (error) throw error;
        categories = data;
        renderCategories();
    } catch (error) {
        handleError(error, 'Fetching Categories');
    }
}

async function fetchTools() {
    try {
        const { data, error } = await supabase
            .from('tools')
            .select('*, categories(name)')
            .eq('available', true) // Only show available tools
            .order('name');

        if (error) throw error;
        allTools = data;
        renderTools();
    } catch (error) {
        handleError(error, 'Fetching Tools');
        grid.innerHTML = '<div class="col-span-full text-center text-danger">Erro ao carregar ferramentas.</div>';
    }
}

function renderCategories() {
    // Keep "Todos" button
    const allBtn = categoriesContainer.firstElementChild;
    categoriesContainer.innerHTML = '';
    categoriesContainer.appendChild(allBtn);

    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-outline category-filter whitespace-nowrap';
        btn.dataset.id = cat.id;
        btn.textContent = cat.name; // textContent is safe
        categoriesContainer.appendChild(btn);
    });
}

function renderTools() {
    if (allTools.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center text-muted py-10">Nenhuma ferramenta disponível no momento.</div>';
        return;
    }

    // Filter
    const filtered = allTools.filter(tool => {
        const matchCat = currentCategory === 'all' || tool.category_id === currentCategory;
        const matchSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center text-muted py-10">Nenhuma ferramenta encontrada para sua busca.</div>';
        return;
    }

    grid.innerHTML = filtered.map(tool => `
        <div class="card flex flex-col h-full">
            <img src="${tool.image_url || 'https://placehold.co/400x300?text=Sem+Imagem'}" alt="${escapeHtml(tool.name)}" class="card-image">
            <div class="card-content flex-1">
                <div class="flex justify-between items-start mb-2">
                    <span class="text-xs font-semibold text-primary bg-blue-50 px-2 py-1 rounded">${escapeHtml(tool.categories?.name || 'Geral')}</span>
                    <span class="badge ${tool.stock_available > 0 ? 'badge-success' : 'badge-danger'}">
                        ${tool.stock_available > 0 ? 'Disponível' : 'Indisponível'}
                    </span>
                </div>
                <h3 class="text-lg font-bold text-gray-800 mb-1">${escapeHtml(tool.name)}</h3>
                <p class="text-sm text-gray-500 line-clamp-2">${escapeHtml(tool.description || '')}</p>
            </div>
            <div class="card-footer">
                <div>
                    <span class="text-xs text-muted block">Diária</span>
                    <span class="text-lg font-bold text-gray-900">R$ ${parseFloat(tool.price_per_day).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <button class="btn btn-primary add-to-cart-btn" 
                    data-id="${tool.id}"
                    ${tool.stock_available <= 0 ? 'disabled' : ''}>
                    ${tool.stock_available > 0 ? 'Adicionar' : 'Esgotado'}
                </button>
            </div>
        </div>
    `).join('');

    // Re-attach event listeners to new buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const toolId = e.target.dataset.id;
            const tool = allTools.find(t => t.id === toolId);
            if (tool) addToCart(tool);
        });
    });
}

function setupEventListeners() {
    // Search
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim();
        renderTools();
    });

    // Category Filter
    categoriesContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('category-filter')) {
            // Update active interaction
            document.querySelectorAll('.category-filter').forEach(b => {
                b.classList.remove('btn-primary', 'text-white');
                b.classList.add('btn-outline');
            });
            e.target.classList.remove('btn-outline');
            e.target.classList.add('btn-primary');

            currentCategory = e.target.dataset.id;
            renderTools();
        }
    });
}

// Start
init();
