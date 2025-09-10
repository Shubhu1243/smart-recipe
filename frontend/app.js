// Recipe Generator Frontend JavaScript

class RecipeGenerator {
    constructor() {
        this.apiBaseUrl = 'https://smart-recipe-backend.vercel.app';
        this.ingredients = [];
        this.selectedEquipment = [];
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadDropdownOptions();
        this.setupIngredientInput();
    }

    bindEvents() {
        const form = document.getElementById('recipeForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.generateRecipe();
            });
        }

        const addBtn = document.getElementById('addIngredient');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.addIngredient();
            });
        }

        const input = document.getElementById('ingredientInput');
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addIngredient();
                }
            });
        }
    }

    setupIngredientInput() {
        const input = document.getElementById('ingredientInput');
        if (input) {
            input.focus();
            input.addEventListener('focus', function() {
                if (this.value === this.placeholder) {
                    this.value = '';
                }
            });
        }
    }

    async loadDropdownOptions() {
        try {
            const cuisines = await this.fetchAPI('/api/recipes/cuisines');
            this.populateSelect('cuisine', cuisines.data);

            const mealTypes = await this.fetchAPI('/api/recipes/meal-types');
            this.populateSelect('mealType', mealTypes.data);

            const dietary = await this.fetchAPI('/api/recipes/dietary-restrictions');
            this.populateSelect('dietaryRestrictions', dietary.data);

            const equipment = await this.fetchAPI('/api/recipes/equipment');
            this.populateEquipmentGrid(equipment.data);

        } catch (error) {
            console.error('Error loading dropdown options:', error);
            this.showError('Failed to load dropdown options. Please refresh.');
        }
    }

    populateSelect(selectId, options) {
        const select = document.getElementById(selectId);
        if (!select) return;
        select.innerHTML = '<option value="">Select...</option>';
        options.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option;
            opt.textContent = option;
            select.appendChild(opt);
        });
    }

    populateEquipmentGrid(equipmentList) {
        const grid = document.getElementById('equipmentGrid');
        if (!grid) return;
        grid.innerHTML = '';
        equipmentList.forEach(equipment => {
            const item = document.createElement('div');
            item.className = 'equipment-item';
            item.innerHTML = `
                <input type="checkbox" id="eq_${equipment}" value="${equipment}">
                <label for="eq_${equipment}">${equipment}</label>
            `;
            item.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox') {
                    const checkbox = item.querySelector('input[type="checkbox"]');
                    checkbox.checked = !checkbox.checked;
                }
                this.updateEquipmentSelection(item, equipment);
            });
            const checkbox = item.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', () => {
                this.updateEquipmentSelection(item, equipment);
            });
            grid.appendChild(item);
        });
    }

    updateEquipmentSelection(item, equipment) {
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (checkbox.checked) {
            item.classList.add('selected');
            if (!this.selectedEquipment.includes(equipment)) {
                this.selectedEquipment.push(equipment);
            }
        } else {
            item.classList.remove('selected');
            this.selectedEquipment = this.selectedEquipment.filter(eq => eq !== equipment);
        }
    }

    addIngredient() {
        const input = document.getElementById('ingredientInput');
        if (!input) return;
        const ingredient = input.value.trim();
        if (ingredient && !this.ingredients.includes(ingredient)) {
            this.ingredients.push(ingredient);
            this.updateIngredientsDisplay();
            input.value = '';
            input.focus();
        }
    }

    removeIngredient(ingredient) {
        this.ingredients = this.ingredients.filter(ing => ing !== ingredient);
        this.updateIngredientsDisplay();
    }

    updateIngredientsDisplay() {
        const container = document.getElementById('ingredientsList');
        if (!container) return;
        container.innerHTML = '';
        this.ingredients.forEach(ingredient => {
            const tag = document.createElement('div');
            tag.className = 'ingredient-tag';
            tag.innerHTML = `
                <span>${ingredient}</span>
                <button type="button" class="remove-ingredient" onclick="recipeGenerator.removeIngredient('${ingredient}')">
                    &times;
                </button>
            `;
            container.appendChild(tag);
        });
    }

    collectFormData() {
        return {
            ingredients: this.ingredients,
            cookingTime: parseInt(document.getElementById('cookingTime')?.value || '0'),
            servings: parseInt(document.getElementById('servings')?.value || '0'),
            difficulty: document.getElementById('difficulty')?.value || '',
            cuisine: document.getElementById('cuisine')?.value || '',
            mealType: document.getElementById('mealType')?.value || '',
            dietaryRestrictions: document.getElementById('dietaryRestrictions')?.value || '',
            equipment: this.selectedEquipment
        };
    }

    validateForm(data) {
        const errors = [];
        if (data.ingredients.length === 0) {
            errors.push('Please add at least one ingredient.');
        }
        if (data.cookingTime < 5 || data.cookingTime > 480) {
            errors.push('Cooking time must be between 5 and 480 minutes.');
        }
        if (data.servings < 1 || data.servings > 20) {
            errors.push('Servings must be between 1 and 20.');
        }
        return errors;
    }

    async generateRecipe() {
        const formData = this.collectFormData();
        const errors = this.validateForm(formData);
        if (errors.length > 0) {
            this.showError(errors.join(' '));
            return;
        }
        this.setLoadingState(true);
        this.hideError();
        try {
            const response = await this.fetchAPI('/api/recipes/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (response.success) {
                this.displayRecipe(response.data);
                this.scrollToRecipe();
            } else {
                throw new Error(response.error || 'Recipe generation failed.');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showError(error.message || 'Error generating recipe.');
        } finally {
            this.setLoadingState(false);
        }
    }

    async fetchAPI(endpoint, options = {}) {
        const url = this.apiBaseUrl + endpoint;
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        return await response.json();
    }

    setLoadingState(loading) {
        const button = document.getElementById('generateBtn');
        if (!button) return;
        button.disabled = loading;
        if (loading) {
            button.classList.add('loading');
        } else {
            button.classList.remove('loading');
        }
    }

    displayRecipe(recipe) {
        document.querySelector('.form-container').style.display = 'none';
        document.getElementById('recipeResult').classList.remove('hidden');
        document.getElementById('recipeTitle').textContent = recipe.title || 'Generated Recipe';
        document.getElementById('recipeDescription').textContent = recipe.description || '';
        document.getElementById('recipeTotalTime').textContent = `${recipe.totalTime || recipe.cookTime || 'N/A'} min`;
        document.getElementById('recipeServings').textContent = `${recipe.servings || 'N/A'} servings`;
        document.getElementById('recipeDifficulty').textContent = recipe.difficulty || 'Medium';
        document.getElementById('recipeCuisine').textContent = recipe.cuisine || 'Mixed';
        this.displayIngredients(recipe.ingredients || []);
        this.displayEquipment(recipe.equipment || []);
        this.displayInstructions(recipe.instructions || []);
        this.displayTips(recipe.tips || []);
        this.displayNutrition(recipe.nutritionInfo || {});
        document.getElementById('recipeStorage').textContent = recipe.storage || 'Store in refrigerator';
        this.displayVariations(recipe.variations || []);
    }

    displayIngredients(ingredients) {
        const container = document.getElementById('recipeIngredients');
        if (!container) return;
        container.innerHTML = '';
        ingredients.forEach(ingredient => {
            const li = document.createElement('li');
            if (typeof ingredient === 'string') {
                li.textContent = ingredient;
            } else {
                li.innerHTML = `
                    <div>
                        <span>${ingredient.item || ingredient.name}</span>
                        ${ingredient.notes ? `<small>${ingredient.notes}</small>` : ''}
                    </div>
                    <div>${ingredient.amount || ''} ${ingredient.unit || ''}</div>
                `;
            }
            container.appendChild(li);
        });
    }

    displayEquipment(equipment) {
        const container = document.getElementById('recipeEquipment');
        if (!container) return;
        container.innerHTML = '';
        equipment.forEach(item => {
            const span = document.createElement('span');
            span.className = 'equipment-badge';
            span.textContent = item;
            container.appendChild(span);
        });
    }

    displayInstructions(instructions) {
        const container = document.getElementById('recipeInstructions');
        if (!container) return;
        container.innerHTML = '';
        instructions.forEach((inst, index) => {
            const li = document.createElement('li');
            if (typeof inst === 'string') {
                li.textContent = inst;
            } else {
                li.innerHTML = `
                    <div>${inst.instruction}</div>
                    ${inst.time || inst.temperature ? `
                        <small>
                            ${inst.time ? `Time: ${inst.time}` : ''}
                            ${inst.temperature ? ` Temp: ${inst.temperature}` : ''}
                        </small>` : ''}
                `;
            }
            container.appendChild(li);
        });
    }

    displayTips(tips) {
        const container = document.getElementById('recipeTips');
        if (!container) return;
        container.innerHTML = '';
        tips.forEach(tip => {
            const li = document.createElement('li');
            li.textContent = tip;
            container.appendChild(li);
        });
    }

    displayNutrition(nutrition) {
        const container = document.getElementById('recipeNutrition');
        if (!container) return;
        container.innerHTML = '';
        const items = [
            { label: 'Calories', value: nutrition.calories },
            { label: 'Protein', value: nutrition.protein },
            { label: 'Carbs', value: nutrition.carbs },
            { label: 'Fat', value: nutrition.fat }
        ];
        items.forEach(item => {
            if (item.value) {
                const div = document.createElement('div');
                div.innerHTML = `${item.label}: ${item.value}`;
                container.appendChild(div);
            }
        });
        if (container.innerHTML === '') {
            container.innerHTML = '<p>Nutrition info not available.</p>';
        }
    }

    displayVariations(variations) {
        const container = document.getElementById('recipeVariations');
        if (!container) return;
        container.innerHTML = '';
        if (variations.length === 0) {
            container.innerHTML = '<li>Try experimenting with different ingredients!</li>';
        } else {
            variations.forEach(variation => {
                const li = document.createElement('li');
                li.textContent = variation;
                container.appendChild(li);
            });
        }
    }

    scrollToRecipe() {
        setTimeout(() => {
            document.getElementById('recipeResult')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }

    showError(message) {
        const errorElement = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');
        if (!errorElement || !errorText) return;
        errorText.textContent = message;
        errorElement.classList.remove('hidden');
        setTimeout(() => {
            this.hideError();
        }, 8000);
        errorElement.scrollIntoView({ behavior: 'smooth' });
    }

    hideError() {
        const errorElement = document.getElementById('errorMessage');
        if (!errorElement) return;
        errorElement.classList.add('hidden');
    }
}

// Global functions
function resetForm() {
    document.querySelector('.form-container').style.display = 'block';
    document.getElementById('recipeResult').classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    recipeGenerator.ingredients = [];
    recipeGenerator.selectedEquipment = [];
    recipeGenerator.updateIngredientsDisplay();
    document.querySelectorAll('.equipment-item').forEach(item => {
        item.classList.remove('selected');
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (checkbox) checkbox.checked = false;
    });
    document.getElementById('cookingTime').value = '30';
    document.getElementById('servings').value = '4';
    document.getElementById('difficulty').value = 'Medium';
    document.getElementById('cuisine').value = '';
    document.getElementById('mealType').value = '';
    document.getElementById('dietaryRestrictions').value = '';
    document.getElementById('ingredientInput').value = '';
    document.getElementById('ingredientInput').focus();
    recipeGenerator.hideError();
}

function printRecipe() {
    window.print();
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    window.recipeGenerator = new RecipeGenerator();
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') === 'true') {
        recipeGenerator.ingredients = ['chicken breast', 'rice', 'broccoli'];
        recipeGenerator.updateIngredientsDisplay();
    }
});

// Handle keyboard events
window.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
        resetForm();
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        recipeGenerator.generateRecipe();
    }
});

// Handle offline/online events
window.addEventListener('online', () => {
    recipeGenerator.hideError();
    console.log('Network restored.');
});
window.addEventListener('offline', () => {
    recipeGenerator.showError('You are offline. Please check your connection.');
});

// Lazy load images if supported
if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('loaded');
                obs.unobserve(entry.target);
            }
        });
    });
    document.querySelectorAll('.lazy-load').forEach(img => observer.observe(img));
}
