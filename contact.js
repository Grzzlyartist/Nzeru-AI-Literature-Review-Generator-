document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('contactForm');
    const feedback = document.getElementById('contactFeedback');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = form.name.value.trim();
        const email = form.email.value.trim();
        const subject = form.subject.value.trim();
        const message = form.message.value.trim();

        if (!name || !email || !subject || !message) {
            showFeedback('Please fill out all required fields.', 'error');
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showFeedback('Please enter a valid email address.', 'error');
            return;
        }

        // Simulate async send
        showFeedback('Sending...', 'pending');
        await new Promise(r => setTimeout(r, 1000));
        showFeedback('Thanks! Your message has been sent. We will get back to you shortly.', 'success');
        form.reset();
    });

    function showFeedback(text, type) {
        feedback.textContent = text;
        feedback.style.display = 'block';
        const colors = { success: '#10b981', error: '#ef4444', pending: '#2563eb' };
        feedback.style.color = colors[type] || '#111827';
    }
});


