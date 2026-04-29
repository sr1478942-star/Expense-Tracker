// HTML se sabhi zaroori elements ko select karna
const form = document.getElementById('expense-form');
const expenseName = document.getElementById('expense-name');
const expenseAmount = document.getElementById('expense-amount');
const expenseList = document.getElementById('expense-list');
const totalAmountSpan = document.getElementById('total-amount');

// Total kharcha shuru mein zero (0) rakhte hain
let totalAmount = 0;

// Jab hum 'Add Expense' button dabate hain toh ye function chalta hai
form.addEventListener('submit', function(event) {
    // Page ko reload hone se rokna (warna data gayab ho jayega)
    event.preventDefault();

    // Input fields se values nikalna
    const nameValue = expenseName.value;
    const amountValue = Number(expenseAmount.value); // Number mein convert kiya

    // Naya list item (li) banana
    const newExpense = document.createElement('li');
    newExpense.innerHTML = `<span>${nameValue}</span> <span>₹${amountValue}</span>`;

    // Naye item ko ul list ke andar daal dena
    expenseList.appendChild(newExpense);

    // Total paise update karna
    totalAmount = totalAmount + amountValue;
    totalAmountSpan.innerText = totalAmount;

    // Form ko wapas khali (clear) kar dena agli entry ke liye
    expenseName.value = '';
    expenseAmount.value = '';
});