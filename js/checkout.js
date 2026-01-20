
import { supabase, handleError } from './supabase.js';
import { cart, clearCart } from './cart.js';

const dateStartInput = document.getElementById('date-start');
const dateEndInput = document.getElementById('date-end');
const totalDaysSpan = document.getElementById('total-days');
const finalTotalSpan = document.getElementById('final-total');
const checkoutBtn = document.getElementById('checkout-btn');

// Coupon Elements
const couponInput = document.getElementById('coupon-input');
const applyCouponBtn = document.getElementById('apply-coupon-btn');
const couponMessage = document.getElementById('coupon-message');

// State
let startDate = null;
let endDate = null;
let totalDays = 0;
let finalTotal = 0;
let currentCoupon = null; // { code: '...', type: 'percent', value: 10 }

// Listeners
document.addEventListener('cartUpdated', calculateTotal);
dateStartInput.addEventListener('change', updateDates);
dateEndInput.addEventListener('change', updateDates);
checkoutBtn.addEventListener('click', handleCheckout);
applyCouponBtn.addEventListener('click', handleApplyCoupon);

function updateDates() {
    const s = dateStartInput.value;
    const e = dateEndInput.value;

    if (s && e) {
        const start = new Date(s);
        const end = new Date(e);
        const diffTime = Math.abs(end - start);
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

async function handleApplyCoupon() {
    const code = couponInput.value.trim().toUpperCase();
    if (!code) return;

    applyCouponBtn.innerText = '...';
    applyCouponBtn.disabled = true;
    couponMessage.classList.add('hidden');

    try {
        const { data, error } = await supabase
            .from('coupons')
            .select('*')
            .eq('code', code)
            .eq('active', true)
            .single();

        if (error || !data) {
            throw new Error('Cupom inválido ou expirado.');
        }

        currentCoupon = data;
        couponMessage.textContent = `Cupom ${code} aplicado!`;
        couponMessage.className = 'text-xs mt-1 text-green-600';
        couponMessage.classList.remove('hidden');
        calculateTotal();

    } catch (error) {
        currentCoupon = null;
        couponMessage.textContent = 'Cupom inválido.';
        couponMessage.className = 'text-xs mt-1 text-red-500';
        couponMessage.classList.remove('hidden');
        calculateTotal(); // Recalculate to remove discount if any
    } finally {
        applyCouponBtn.innerText = 'Aplicar';
        applyCouponBtn.disabled = false;
    }
}

function calculateTotal() {
    if (totalDays > 0 && cart.length > 0) {
        const dailyTotal = cart.reduce((sum, item) => sum + parseFloat(item.price_per_day), 0);
        let total = dailyTotal * totalDays;

        // Apply Discount
        if (currentCoupon) {
            if (currentCoupon.discount_type === 'percent') {
                total = total - (total * (currentCoupon.discount_value / 100));
            } else if (currentCoupon.discount_type === 'fixed') {
                total = total - currentCoupon.discount_value;
            }
            if (total < 0) total = 0;
        }

        finalTotal = total;

        let displayTotal = finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        if (currentCoupon) {
            finalTotalSpan.innerHTML = `<span class="line-through text-xs text-gray-400 mr-2">R$ ${(dailyTotal * totalDays).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span> R$ ${displayTotal}`;
        } else {
            finalTotalSpan.textContent = `R$ ${displayTotal}`;
        }

        checkoutBtn.disabled = false;
    } else {
        finalTotal = 0;
        finalTotalSpan.textContent = 'R$ 0,00';
        checkoutBtn.disabled = true;
    }
}

async function handleCheckout() {
    if (cart.length === 0) return alert('Carrinho vazio.');
    if (!startDate || !endDate) return alert('Selecione as datas de início e fim.');

    const name = prompt('Por favor, digite seu NOME COMPLETO:');
    if (!name) return;

    const Phone = prompt('Por favor, digite seu CELULAR (WhatsApp) com DDD:\nEx: 11999999999');
    if (!Phone) return;

    // Loading State
    const originalText = checkoutBtn.innerText;
    checkoutBtn.innerText = 'Processando...';
    checkoutBtn.disabled = true;

    try {
        // 1. Create Rental in Supabase
        const rentalPayload = {
            customer_name: name,
            customer_phone: Phone,
            start_date: startDate,
            end_date: endDate,
            total_days: totalDays,
            total_price: finalTotal,
            status: 'pending'
        };

        if (currentCoupon) {
            rentalPayload.coupon_code = currentCoupon.code;
            // Calculate saved amount
            const dailyTotal = cart.reduce((sum, item) => sum + parseFloat(item.price_per_day), 0);
            const originalTotal = dailyTotal * totalDays;
            rentalPayload.discount_applied = originalTotal - finalTotal;
        }

        const { data: rental, error: rentalError } = await supabase
            .from('rentals')
            .insert([rentalPayload])
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

        let msg = `*NOVO PEDIDO DE ALUGUEL* 🛠️%0A%0A` +
            `*Cliente:* ${name}%0A` +
            `*Telefone:* ${Phone}%0A%0A` +
            `*Ferramentas:*%0A${toolsList}%0A%0A` +
            `*Período:* ${new Date(startDate).toLocaleDateString()} a ${new Date(endDate).toLocaleDateString()} (${totalDays} dias)%0A` +
            `*Total Final:* R$ ${finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}%0A`;

        if (currentCoupon) {
            msg += `*Cupom Aplicado:* ${currentCoupon.code}%0A%0A`;
        } else {
            msg += `%0A`;
        }

        msg += `_Pedido gerado via Website._`;

        // Fetch company settings
        let adminPhone = '5511999999999';
        try {
            const { data: settings } = await supabase.from('settings').select('whatsapp_number').single();
            if (settings && settings.whatsapp_number) {
                // Remove non-digits
                const cleanNumber = settings.whatsapp_number.replace(/\D/g, '');
                if (cleanNumber.length > 8) adminPhone = cleanNumber;
            }
        } catch (e) { console.error(e); }

        const waLink = `https://wa.me/${adminPhone}?text=${msg}`;

        // Success
        alert('Pedido realizado com sucesso! Você será redirecionado para o WhatsApp para confirmar.');
        window.open(waLink, '_blank');

        clearCart();
        document.getElementById('cart-modal').classList.remove('open');
        // Reset state
        currentCoupon = null;
        couponInput.value = '';
        couponMessage.classList.add('hidden');

    } catch (error) {
        handleError(error, 'Checkout');
    } finally {
        checkoutBtn.innerText = originalText;
        checkoutBtn.disabled = false;
    }
}
