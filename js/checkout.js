
import { supabase, handleError } from './supabase.js';
import { cart, clearCart } from './cart.js';

const dateStartInput = document.getElementById('date-start');
const dateEndInput = document.getElementById('date-end');
const totalDaysSpan = document.getElementById('total-days');
const finalTotalSpan = document.getElementById('final-total');
const checkoutBtn = document.getElementById('checkout-btn');

// State
let startDate = null;
let endDate = null;
let totalDays = 0;
let finalTotal = 0;

// Listeners
document.addEventListener('cartUpdated', calculateTotal);
dateStartInput.addEventListener('change', updateDates);
dateEndInput.addEventListener('change', updateDates);
checkoutBtn.addEventListener('click', handleCheckout);

function updateDates() {
    const s = dateStartInput.value;
    const e = dateEndInput.value;

    if (s && e) {
        const start = new Date(s);
        const end = new Date(e);

        // Diff in milliseconds
        const diffTime = Math.abs(end - start);
        // Diff in days (ceil to ensure at least 1 day if same day return logic allows, 
        // but typically day diff. Let's assume minimum 1 day)
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) {
            alert('A data de devolução deve ser posterior à data de início.');
            dateEndInput.value = '';
            totalDays = 0;
            return;
        }

        startDate = s;
        endDate = e;
        totalDays = diffDays;
        totalDaysSpan.textContent = totalDays;

        calculateTotal();
    }
}

function calculateTotal() {
    if (totalDays > 0 && cart.length > 0) {
        const dailyTotal = cart.reduce((sum, item) => sum + parseFloat(item.price_per_day), 0);
        finalTotal = dailyTotal * totalDays;
        finalTotalSpan.textContent = `R$ ${finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    } else {
        finalTotal = 0;
        finalTotalSpan.textContent = 'R$ 0,00';
    }
}

async function handleCheckout() {
    if (cart.length === 0) return alert('Carrinho vazio.');
    if (!startDate || !endDate) return alert('Selecione as datas de início e fim.');

    const name = prompt('Por favor, digite seu NOME COMPLETO:');
    if (!name) return;

    const phone = prompt('Por favor, digite seu CELULAR (WhatsApp) com DDD:\nEx: 11999999999');
    if (!phone) return;

    // Loading State
    const originalText = checkoutBtn.innerText;
    checkoutBtn.innerText = 'Processando...';
    checkoutBtn.disabled = true;

    try {
        // 1. Create Rental in Supabase
        const { data: rental, error: rentalError } = await supabase
            .from('rentals')
            .insert([{
                customer_name: name,
                customer_phone: phone,
                start_date: startDate,
                end_date: endDate,
                total_days: totalDays,
                total_price: finalTotal,
                status: 'pending'
            }])
            .select()
            .single();

        if (rentalError) throw rentalError;

        // 2. Create Rental Items
        const rentalItems = cart.map(tool => ({
            rental_id: rental.id,
            tool_id: tool.id,
            price_at_rental: tool.price_per_day
        }));

        const { error: itemsError } = await supabase
            .from('rental_items')
            .insert(rentalItems);

        if (itemsError) throw itemsError;

        // 3. WhatsApp Message
        const toolsList = cart.map(t => `- ${t.name}`).join('%0A');
        const msg = `*NOVO PEDIDO DE ALUGUEL* 🛠️%0A%0A` +
            `*Cliente:* ${name}%0A` +
            `*Telefone:* ${phone}%0A%0A` +
            `*Ferramentas:*%0A${toolsList}%0A%0A` +
            `*Período:* ${new Date(startDate).toLocaleDateString()} a ${new Date(endDate).toLocaleDateString()} (${totalDays} dias)%0A` +
            `*Total Estimado:* R$ ${finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}%0A%0A` +
            `_Pedido gerado via Website._`;

        // Fetch company settings if available, else use a placeholder or assume admin logic on backend 
        // For now user requested frontend automation.
        // We need the company number. Let's hardcode user own number or a placeholder prompt if detailed config isn't loaded.
        // For this MVP, let's open prompt to user or assume a fixed number.
        // Per requirements: "Mensagem automática enviada para WhatsApp do ADMIN"
        // Let's assume we fetch this setting or hardcode it for now.
        // I will attempt to fetch settings, if empty, use a placeholder.

        let adminPhone = '5511999999999'; // Default
        const { data: settings } = await supabase.from('settings').select('whatsapp_number').single();
        if (settings && settings.whatsapp_number) {
            adminPhone = settings.whatsapp_number.replace(/\D/g, ''); // just numbers
        }

        const waLink = `https://wa.me/${adminPhone}?text=${msg}`;

        // Success
        alert('Pedido realizado com sucesso! Você será redirecionado para o WhatsApp para confirmar.');
        window.open(waLink, '_blank');

        clearCart();
        document.getElementById('cart-modal').classList.remove('open');

    } catch (error) {
        handleError(error, 'Checkout');
    } finally {
        checkoutBtn.innerText = originalText;
        checkoutBtn.disabled = false;
    }
}
