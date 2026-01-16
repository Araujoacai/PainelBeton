
// Messages & Automation

export function generateWhatsAppLink(rental, type = 'manual') {
    let text = '';
    const name = rental.customer_name.split(' ')[0]; // First name
    const endDate = new Date(rental.end_date).toLocaleDateString('pt-BR');

    if (type === 'manual') {
        text = `Olá ${name}, aqui é da LocaTools. Gostaria de falar sobre seu aluguel.`;
    } else if (type === 'confirm') {
        text = `Olá ${name}! Seu aluguel foi confirmado. Devolução prevista para: ${endDate}. Obrigado!`;
    } else if (type === 'reminder') {
        text = `Olá ${name}, lembrete: seu aluguel vence amanhã (${endDate}).`;
    } else if (type === 'overdue') {
        text = `Olá ${name}, seu aluguel venceu em ${endDate}. Por favor, entre em contato para devolução ou renovação.`;
    }

    // Format phone (remove chars)
    const phone = rental.customer_phone.replace(/\D/g, '');
    // Add 55 if missing (simple heuristic)
    const fullPhone = phone.length <= 11 ? `55${phone}` : phone;

    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
}

// Function to check for automatic alerts (run on dashboard load)
// This would look for rentals expiring soon and show notifications/buttons
export function checkAutomations(rentals) {
    // Implement if needed for 'automatic verification' logic
    console.log('Checking automations...');
}
