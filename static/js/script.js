document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('prediction-form');
    const resultContainer = document.getElementById('result-container');
    const predictionBadge = document.getElementById('prediction-badge');
    const probabilityBars = document.getElementById('probability-bars');
    const probabilitySection = document.getElementById('probability-section');
    const errorMessage = document.getElementById('error-message');
    const submitBtn = document.querySelector('.submit-btn');
    const btnText = document.querySelector('.btn-text');
    const btnLoader = document.getElementById('btn-loader');

    const colorMap = {
        'Retain': 'var(--success)',
        'Churn': 'var(--danger)',
        'Downgrade': 'var(--warning)',
        'Upgrade': 'var(--upgrade)'
    };

    const classMap = {
        'Retain': 'badge-retain',
        'Churn': 'badge-churn',
        'Downgrade': 'badge-downgrade',
        'Upgrade': 'badge-upgrade'
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // UI Loading State
        btnText.classList.add('hidden');
        btnLoader.classList.remove('hidden');
        submitBtn.style.pointerEvents = 'none';
        
        // Hide previous results
        resultContainer.classList.add('hidden');
        errorMessage.classList.add('hidden');
        
        // Gather data
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                // Display Prediction Badge
                const pred = result.prediction;
                predictionBadge.textContent = pred;
                predictionBadge.className = `status-badge ${classMap[pred] || 'badge-retain'}`;
                
                // Display Probabilities
                if (result.probabilities) {
                    probabilitySection.classList.remove('hidden');
                    probabilityBars.innerHTML = '';
                    
                    // Sort probabilities highest to lowest
                    const sortedProbs = Object.entries(result.probabilities)
                        .sort(([,a], [,b]) => b - a);

                    sortedProbs.forEach(([label, value], index) => {
                        const row = document.createElement('div');
                        row.className = 'prob-row';
                        
                        const color = colorMap[label] || 'var(--primary)';
                        
                        row.innerHTML = `
                            <div class="prob-label">${label}</div>
                            <div class="prob-bar-track">
                                <div class="prob-bar-fill" style="background: ${color}; width: 0%"></div>
                            </div>
                            <div class="prob-value">${value}%</div>
                        `;
                        
                        probabilityBars.appendChild(row);
                        
                        // Animate bars
                        setTimeout(() => {
                            row.querySelector('.prob-bar-fill').style.width = `${value}%`;
                        }, 100 + (index * 150));
                    });
                } else {
                    probabilitySection.classList.add('hidden');
                }

                resultContainer.classList.remove('hidden');
                // Scroll to result smoothly
                resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                showError(result.error || 'Failed to generate forecast.');
            }
        } catch (error) {
            showError('Network error or server is down.');
        } finally {
            // Reset Button State
            btnText.classList.remove('hidden');
            btnLoader.classList.add('hidden');
            submitBtn.style.pointerEvents = 'auto';
        }
    });

    function showError(msg) {
        errorMessage.textContent = msg;
        errorMessage.classList.remove('hidden');
        resultContainer.classList.remove('hidden');
        probabilitySection.classList.add('hidden');
        predictionBadge.parentElement.classList.add('hidden'); // Hide the header
    }
});
