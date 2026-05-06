const form = document.getElementById('expense-form');
const expenseName = document.getElementById('expense-name');
const expenseCategory = document.getElementById('expense-category'); 
const expenseAmount = document.getElementById('expense-amount');
const expenseList = document.getElementById('expense-list');
const totalAmountSpan = document.getElementById('total-amount');
const monthFilterInput = document.getElementById('month-filter');
const datalistOptions = document.getElementById('location-options'); 
const submitBtn = form.querySelector('button[type="submit"]');

let expenses = JSON.parse(localStorage.getItem('myExpenses')) || [];

// JADU 1: Puraane galat data ko automatic ID (Roll Number) dena taaki unhe delete kiya ja sake
let dataChanged = false;
expenses.forEach(exp => {
    if (!exp.id) {
        exp.id = Date.now() + Math.floor(Math.random() * 1000); // Unique ID banana
        dataChanged = true;
    }
});
if (dataChanged) {
    localStorage.setItem('myExpenses', JSON.stringify(expenses));
}

let editExpenseId = null; // Ye yaad rakhega ki kaunsa item Edit ho raha hai

function showData() {
    expenseList.innerHTML = ''; 
    datalistOptions.innerHTML = ''; 
    let overallTotal = 0;
    let selectedMonth = monthFilterInput.value; 

    let groupedData = {};

    for (let i = 0; i < expenses.length; i++) {
        let exp = expenses[i];

        if (selectedMonth !== "" && exp.monthYear !== selectedMonth) {
            continue; 
        }

        overallTotal = overallTotal + exp.amount;

        let cleanName = exp.name.trim().replace(/\s+/g, ' '); 
        let naamKey = cleanName.toLowerCase();

        // History list me ab ID bhi save kar rahe hain
        if (groupedData[naamKey] == undefined) {
            groupedData[naamKey] = {
                asliNaam: cleanName, 
                totalPaisa: exp.amount,
                historyList: [ { id: exp.id, time: exp.time, paisa: exp.amount, cat: exp.category } ] 
            };
        } else {
            groupedData[naamKey].totalPaisa = groupedData[naamKey].totalPaisa + exp.amount; 
            groupedData[naamKey].historyList.push({ id: exp.id, time: exp.time, paisa: exp.amount, cat: exp.category }); 
        }
    }

    for (let key in groupedData) {
        let item = groupedData[key];

        const option = document.createElement('option');
        option.value = item.asliNaam;
        datalistOptions.appendChild(option);

        let mainIcon = '📍'; 

        let historyHTML = '';
        for (let j = 0; j < item.historyList.length; j++) {
            let subCat = item.historyList[j].cat || 'other';
            let subIcon = '💰'; 
            let catName = 'Other/Anya';

            if (subCat === 'market') { subIcon = '🛒'; catName = 'Market/Sabji'; }
            if (subCat === 'food') { subIcon = '🍔'; catName = 'Food/Canteen'; }
            if (subCat === 'travel') { subIcon = '🚌'; catName = 'Travel/Petrol'; }
            if (subCat === 'education') { subIcon = '📚'; catName = 'College/Books'; }

            // NAYA: Edit aur Delete ke buttons HTML me add kiye
            historyHTML = historyHTML + `
                <div class="sub-item">
                    <div class="sub-item-left">
                        <span style="font-size: 18px;">${subIcon}</span>
                        <div class="sub-text-group">
                            <span class="sub-cat-name">${catName}</span>
                            <span class="sub-time">${item.historyList[j].time}</span>
                        </div>
                    </div>
                    <div class="sub-item-right">
                        <strong>₹${item.historyList[j].paisa}</strong>
                        <div class="action-buttons">
                            <span class="edit-btn" onclick="editRecord(${item.historyList[j].id})" title="Edit karein">✏️</span>
                            <span class="delete-btn" onclick="deleteRecord(${item.historyList[j].id})" title="Delete karein">🗑️</span>
                        </div>
                    </div>
                </div>
            `;
        }

        const li = document.createElement('li');
        li.innerHTML = `
            <div class="item-main" title="Upar form me daalne ke liye click karein">
                <div class="item-left">
                    <span class="item-icon">${mainIcon}</span>
                    <strong>${item.asliNaam} <span class="item-count">(${item.historyList.length} Items)</span></strong>
                </div>
                <span class="item-total">Total: ₹${item.totalPaisa}</span>
            </div>
            <div class="item-history-box">
                ${historyHTML}
            </div>
        `;
        
        li.querySelector('.item-main').addEventListener('click', function() {
            expenseName.value = item.asliNaam; 
            expenseCategory.focus(); 
            window.scrollTo({ top: 0, behavior: 'smooth' }); 
        });

        expenseList.appendChild(li); 
    }

    totalAmountSpan.innerText = overallTotal;
}

// JADU 2: Delete karne ka Function
window.deleteRecord = function(id) {
    if (confirm("Kya aap sach me is kharche ko delete karna chahte hain?")) {
        // filter() array me se us ID wale item ko nikal deta hai
        expenses = expenses.filter(exp => exp.id !== id);
        localStorage.setItem('myExpenses', JSON.stringify(expenses));
        showData(); // Screen wapas update karo
    }
}

// JADU 3: Edit karne ka Function
window.editRecord = function(id) {
    // Check karo ki array me ye ID kahan hai
    let exp = expenses.find(e => e.id === id);
    if (exp) {
        expenseName.value = exp.name;
        expenseCategory.value = exp.category || 'other';
        expenseAmount.value = exp.amount;
        
        editExpenseId = id; // Yaad rakho ki hum naya nahi bana rahe, purana edit kar rahe hain
        
        // Button ka color aur text badal do taaki pata chale ki Edit mode on hai
        submitBtn.innerText = "Update Expense";
        submitBtn.style.backgroundColor = "#f39c12"; // Orange color
        
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Form pe wapas upar jao
    }
}

// JADU 4: Form Submit - Naya add karna hai ya Purana Edit?
form.addEventListener('submit', function(event) {
    event.preventDefault(); 

    const nameValue = expenseName.value.trim().replace(/\s+/g, ' ');
    const categoryValue = expenseCategory.value; 
    const amountValue = Number(expenseAmount.value); 

    if (editExpenseId !== null) {
        // AGAR EDIT MODE ON HAI (Purana theek karo)
        for (let i = 0; i < expenses.length; i++) {
            if (expenses[i].id === editExpenseId) {
                expenses[i].name = nameValue;
                expenses[i].category = categoryValue;
                expenses[i].amount = amountValue;
                break;
            }
        }
        
        // Edit khatam, wapas normal mode me aao
        editExpenseId = null;
        submitBtn.innerText = "Add Expense";
        submitBtn.style.backgroundColor = "#2ecc71"; // Wapas Green color

    } else {
        // AGAR NORMAL MODE HAI (Naya add karo)
        const now = new Date();
        const fullDisplayTime = now.toLocaleDateString('en-IN') + " | " + now.toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'});
        
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const monthYearValue = year + "-" + month;

        const newRecord = {
            id: Date.now(), // Naya Unique ID
            name: nameValue,
            category: categoryValue,
            amount: amountValue,
            time: fullDisplayTime,       
            monthYear: monthYearValue    
        };

        expenses.push(newRecord);
    }

    localStorage.setItem('myExpenses', JSON.stringify(expenses));

    expenseName.value = '';
    expenseAmount.value = '';
    
    showData();
});

monthFilterInput.addEventListener('change', function() {
    showData();
});

showData();