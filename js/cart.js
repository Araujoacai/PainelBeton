
// Cart State
export let cart = JSON.parse(localStorage.getItem('locatools_cart')) || [];

// DOM Elements
const cartBtn = document.getElementById('cart-btn');
const cartModal = document.getElementById('cart-modal');
const closeCartBtn = document.getElementById('close-cart');
const cartCount = document.getElementById('cart-count');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalElement = document.getElementById('cart-total');
const checkoutBtn = document.getElementById('checkout-btn');

// Add to Cart
export function addToCart(tool) {
    // Check if item already exists
    if (!cart.find(item => item.id === tool.id)) {
        cart.push(tool);
        saveCart();
        updateCartUI();

        // Visual feedback
        const badge = document.getElementById('cart-count');
        badge.classList.add('animate-bounce'); // Using Tailwind class assuming it's available or we can add css
        setTimeout(() => badge.classList.remove('animate-bounce'), 500);
    } else {
        alert('Este item já está no carrinho.');
    }
}

// Remove from Cart
function removeFromCart(toolId) {
    cart = cart.filter(item => item.id !== toolId);
    saveCart();
    updateCartUI();
}

// Save to LocalStorage
function saveCart() {
    localStorage.setItem('locatools_cart', JSON.stringify(cart));
}

// Export for checkout to clear
export function clearCart() {
    cart = [];
    saveCart();
    updateCartUI();
}

// Update UI
function updateCartUI() {
    // Update Badge
    cartCount.textContent = cart.length;

    // Update List
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<div class="text-center text-muted py-8">Seu carrinho está vazio.</div>';
        cartTotalElement.textContent = 'R$ 0,00';
        checkoutBtn.disabled = true;
    } else {
        cartItemsContainer.innerHTML = cart.map(item => `
            <div class="flex justify-between items-center bg-gray-50 p-3 rounded border border-gray-100">
                <div class="flex items-center gap-3">
                    <img src="${item.image_url || 'https://placehold.co/40x40'}" class="w-10 h-10 rounded object-cover">
                    <div>
                        <h4 class="text-sm font-semibold text-gray-800">${item.name}</h4>
                        <span class="text-xs text-muted">R$ ${parseFloat(item.price_per_day).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / dia</span>
                    </div>
                </div>
                <button class="remove-btn text-red-500 hover:text-red-700" data-id="${item.id}">
                    <i class="uil uil-trash-alt"></i>
                </button>
            </div>
        `).join('');

        // Re-attach listeners
        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                removeFromCart(e.currentTarget.dataset.id); // Use currentTarget because of icon
            });
        });

        // Calculate Daily Total
        const totalDaily = cart.reduce((sum, item) => sum + parseFloat(item.price_per_day), 0);
        cartTotalElement.textContent = `R$ ${totalDaily.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        checkoutBtn.disabled = false;
    }

    // Trigger update for checkout calculation if it exists
    document.dispatchEvent(new CustomEvent('cartUpdated', { detail: cart }));
}

// Modal Logic
if (cartBtn) {
    cartBtn.addEventListener('click', () => {
        cartModal.classList.add('open');
    });
}

if (closeCartBtn) {
    closeCartBtn.addEventListener('click', () => {
        cartModal.classList.remove('open');
    });
}

// Close on click outside
window.addEventListener('click', (e) => {
    if (e.target === cartModal) {
        cartModal.classList.remove('open');
    }
});

// Init
updateCartUI();
