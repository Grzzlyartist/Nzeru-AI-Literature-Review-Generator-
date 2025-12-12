
document.addEventListener('DOMContentLoaded', () => {
    // Initialize pricing page functionality
    initializePricingPage();
});

function initializePricingPage() {
    // Billing toggle functionality
    const billingToggle = document.getElementById('billingToggle');
    const priceElements = document.querySelectorAll('.amount[data-monthly][data-yearly]');
    
    if (billingToggle) {
        billingToggle.addEventListener('change', () => {
            const isYearly = billingToggle.checked;
            updatePrices(isYearly);
        });
    }
    
    // Initialize prices
    updatePrices(false);
}

function updatePrices(isYearly) {
    const priceElements = document.querySelectorAll('.amount[data-monthly][data-yearly]');
    const periodElements = document.querySelectorAll('.period');
    
    priceElements.forEach(element => {
        const monthlyPrice = element.getAttribute('data-monthly');
        const yearlyPrice = element.getAttribute('data-yearly');
        
        if (isYearly) {
            element.textContent = yearlyPrice;
            const periodElement = element.nextElementSibling;
            if (periodElement && periodElement.classList.contains('period')) {
                periodElement.textContent = '/month (billed yearly)';
            }
        } else {
            element.textContent = monthlyPrice;
            const periodElement = element.nextElementSibling;
            if (periodElement && periodElement.classList.contains('period')) {
                periodElement.textContent = '/month';
            }
        }
    });
}

// Modal functionality
function openPaymentModal(plan) {
    const modal = document.getElementById('paymentModal');
    const selectedPlanElement = document.getElementById('selectedPlan');
    const planPriceElement = document.getElementById('planPrice');
    
    const planDetails = {
        pro: { name: 'Pro Plan', monthlyPrice: 19, yearlyPrice: 15 },
        enterprise: { name: 'Enterprise Plan', monthlyPrice: 49, yearlyPrice: 39 }
    };
    
    const selectedPlan = planDetails[plan];
    const isYearly = document.getElementById('billingToggle')?.checked || false;
    const price = isYearly ? selectedPlan.yearlyPrice : selectedPlan.monthlyPrice;
    
    selectedPlanElement.textContent = selectedPlan.name;
    planPriceElement.textContent = `$${price}`;
    
    modal.setAttribute('data-plan', plan);
    modal.setAttribute('data-price', price);
    modal.setAttribute('data-billing', isYearly ? 'yearly' : 'monthly');
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closePaymentModal() {
    const modal = document.getElementById('paymentModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    document.getElementById('paymentForm').reset();
}

window.onclick = function(event) {
    const modal = document.getElementById('paymentModal');
    if (event.target === modal) {
        closePaymentModal();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const paymentForm = document.getElementById('paymentForm');
    
    if (paymentForm) {
        paymentForm.addEventListener('submit', handlePaymentSubmission);
    }
    
    const cardNumberInput = document.getElementById('cardNumber');
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', formatCardNumber);
    }
    
    const expiryDateInput = document.getElementById('expiryDate');
    if (expiryDateInput) {
        expiryDateInput.addEventListener('input', formatExpiryDate);
    }
    
    const cvvInput = document.getElementById('cvv');
    if (cvvInput) {
        cvvInput.addEventListener('input', formatCVV);
    }
});

function formatCardNumber(e) {
    let value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
    e.target.value = formattedValue;
}

function formatExpiryDate(e) {
    let value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (value.length >= 2) {
        value = value.slice(0, 2) + '/' + value.slice(2, 4);
    }
    e.target.value = value;
}

function formatCVV(e) {
    let value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    e.target.value = value.slice(0, 4);
}

async function handlePaymentSubmission(e) {
    e.preventDefault();
    
    const form = e.target;
    const payButton = document.getElementById('payButton');
    const originalButtonText = payButton.innerHTML;
    
    payButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    payButton.disabled = true;
    
    try {
        const formData = new FormData(form);
        const paymentData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            cardNumber: formData.get('cardNumber').replace(/\s/g, ''),
            expiryDate: formData.get('expiryDate'),
            cvv: formData.get('cvv'),
            plan: document.getElementById('paymentModal').getAttribute('data-plan'),
            price: document.getElementById('paymentModal').getAttribute('data-price'),
            billing: document.getElementById('paymentModal').getAttribute('data-billing')
        };
        
        if (!validatePaymentData(paymentData)) {
            throw new Error('Please fill in all required fields correctly.');
        }
        
        const result = await processIntasendPayment(paymentData);
        
        if (result.success) {
            showPaymentSuccess(result);
        } else {
            throw new Error(result.message || 'Payment failed. Please try again.');
        }
        
    } catch (error) {
        showPaymentError(error.message);
    } finally {
        payButton.innerHTML = originalButtonText;
        payButton.disabled = false;
    }
}

function validatePaymentData(data) {
    if (!data.firstName || !data.lastName || !data.email || !data.phone) return false;
    if (!data.cardNumber || data.cardNumber.length < 13) return false;
    if (!data.expiryDate || !data.cvv) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) return false;
    return true;
}

async function processIntasendPayment(paymentData) {
    try {
        const baseUrl = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' 
            ? 'http://127.0.0.1:8000' 
            : '';
        
        const response = await fetch(`${baseUrl}/api/process-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(paymentData)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.detail || 'Payment processing failed');
        }
        
        return result;
        
    } catch (error) {
        console.error('Payment processing error:', error);
        throw new Error('Network error. Please check your connection and try again.');
    }
}

function showPaymentSuccess(result) {
    // Persist premium status and plan info
    try {
        localStorage.setItem('nzeru_is_premium', 'true');
        localStorage.setItem('nzeru_plan', result.plan || 'pro');
        localStorage.setItem('nzeru_plan_amount', String(result.amount || ''));
        localStorage.setItem('nzeru_txn_id', result.transaction_id || '');
        localStorage.setItem('nzeru_plan_activated_at', new Date().toISOString());
    } catch {}

    // Close modal
    closePaymentModal();
    
    // Show success message and redirect
    const successMessage = `
        <div class="payment-success">
            <div class="success-content">
                <i class="fas fa-check-circle"></i>
                <h3>Payment Successful!</h3>
                <p>Your subscription has been activated. You can now access premium features and unlimited reviews.</p>
                <div class="success-details">
                    <p><strong>Transaction ID:</strong> ${result.transaction_id}</p>
                    <p><strong>Plan:</strong> ${result.plan}</p>
                    <p><strong>Amount:</strong> $${result.amount}</p>
                </div>
                <button class="btn btn-primary" onclick="window.location.href='generator.html'">
                    Start Using Premium Features
                </button>
            </div>
        </div>
    `;
    
    const successModal = document.createElement('div');
    successModal.className = 'modal';
    successModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-body">
                ${successMessage}
            </div>
        </div>
    `;
    
    document.body.appendChild(successModal);
    successModal.style.display = 'block';
    
    setTimeout(() => {
        window.location.href = 'generator.html';
    }, 3500);
}

function showPaymentError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'payment-error';
    errorDiv.innerHTML = `
        <div class="error-content">
            <i class="fas fa-exclamation-triangle"></i>
            <p>${message}</p>
        </div>
    `;
    const formActions = document.querySelector('.form-actions');
    const existingError = document.querySelector('.payment-error');
    if (existingError) existingError.remove();
    formActions.parentNode.insertBefore(errorDiv, formActions);
    setTimeout(() => { if (errorDiv.parentNode) errorDiv.parentNode.removeChild(errorDiv); }, 5000);
}

const style = document.createElement('style');
style.textContent = `
    .payment-success { text-align: center; padding: 2rem; }
    .payment-success i { font-size: 4rem; color: #10b981; margin-bottom: 1rem; }
    .payment-success h3 { font-size: 1.5rem; color: #111827; margin-bottom: 1rem; }
    .payment-success p { color: #6b7280; margin-bottom: 1.5rem; }
    .success-details { background: #f8fafc; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; text-align: left; }
    .success-details p { margin: 0.5rem 0; font-size: 0.9rem; }
    .payment-error { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
    .error-content { display: flex; align-items: center; gap: 0.5rem; color: #dc2626; }
    .error-content i { font-size: 1.2rem; }
`;
document.head.appendChild(style);