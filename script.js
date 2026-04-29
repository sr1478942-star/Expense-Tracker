const form = document.getElementById('expense-form');
const expenseName = document.getElementById('expense-name');
const expenseAmount = document.getElementById('expense-amount');
const expenseList = document.getElementById('expense-list');
const totalAmountSpan = document.getElementById('total-amount');

// 1. Local Storage se data nikalna
// JSON.parse text ko wapas array banata hai
let expenses = JSON.parse(localStorage.getItem('myExpenses'));

// Agar pehli baar app khul raha hai aur data nahi hai, toh khali array bana do
if (expenses == null) {
    expenses = [];
}

// 2. Data ko screen par dikhane ka function
function showData() {
    expenseList.innerHTML = ''; // Pehle purani list saaf karo
    let total = 0;

    // Normal for-loop ka use karke ek-ek kharcha HTML me daalna
    for (let i = 0; i < expenses.length; i++) {
        const newExpense = document.createElement('li');
        newExpense.innerHTML = `<span>${expenses[i].name}</span> <span>₹${expenses[i].amount}</span>`;
        expenseList.appendChild(newExpense);

        // Total amount plus karna
        total = total + expenses[i].amount;
    }

    // Total amount HTML me update karna
    totalAmountSpan.innerText = total;
}

// 3. Jab 'Add Expense' button dabaya jaye
form.addEventListener('submit', function(event) {
    event.preventDefault(); // Page reload hone se rokna

    const nameValue = expenseName.value;
    const amountValue = Number(expenseAmount.value); // Text ko number me badalna

    // Ek object banana jisme naam aur paise hon
    const newRecord = {
        name: nameValue,
        amount: amountValue
    };

    // Us object ko apne array me daal dena
    expenses.push(newRecord);

    // 4. Data ko Local Storage me save karna
    // JSON.stringify array ko text me badal deta hai kyunki storage me sirf text save hota hai
    localStorage.setItem('myExpenses', JSON.stringify(expenses));

    // Form ke dabbe khali karna naye kharche ke liye
    expenseName.value = '';
    expenseAmount.value = '';

    // Screen ko naye data ke sath update karna
    showData();
});

// Pehli baar website open hone par ye function chalega taaki purana data dikh jaye
showData();