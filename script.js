const form = document.getElementById('expense-form');
const expenseName = document.getElementById('expense-name');
const expenseCategory = document.getElementById('expense-category'); 
const expenseAmount = document.getElementById('expense-amount');
const expenseList = document.getElementById('expense-list');
const totalAmountSpan = document.getElementById('total-amount');
const monthFilterInput = document.getElementById('month-filter');

let expenses = JSON.parse(localStorage.getItem('myExpenses'));
if (expenses == null) {
    expenses = [];
}

function showData() {
    expenseList.innerHTML = ''; 
    let overallTotal = 0;
    let selectedMonth = monthFilterInput.value; 

    let groupedData = {};

    for (let i = 0; i < expenses.length; i++) {
        let exp = expenses[i];

        if (selectedMonth !== "" && exp.monthYear !== selectedMonth) {
            continue; 
        }

        overallTotal = overallTotal + exp.amount;

        let naam = exp.name.toLowerCase();

        // NAYA JADU YAHAN HAI: Ab hum historyList mein Category (cat) bhi save kar rahe hain
        if (groupedData[naam] == undefined) {
            groupedData[naam] = {
                asliNaam: exp.name,
                totalPaisa: exp.amount,
                // Pehli baar location mili toh uski detail list me daalo
                historyList: [ { time: exp.time, paisa: exp.amount, cat: exp.category } ] 
            };
        } else {
            groupedData[naam].totalPaisa = groupedData[naam].totalPaisa + exp.amount; 
            // Purani location me nayi detail aur uski CATEGEORY daalo
            groupedData[naam].historyList.push({ time: exp.time, paisa: exp.amount, cat: exp.category }); 
        }
    }

    for (let key in groupedData) {
        let item = groupedData[key];

        // Main heading ka icon ab Map/Location jaisa dikhega (Kyunki ye jagah ka naam hai)
        let mainIcon = '📍'; 

        // Andar ki choti list (History) ka HTML banana
        let historyHTML = '';
        for (let j = 0; j < item.historyList.length; j++) {
            
            // Sub-item ka Icon aur Naam set karna
            let subCat = item.historyList[j].cat || 'other';
            let subIcon = '💰'; 
            let catName = 'Other/Anya';

            if (subCat === 'market') { subIcon = '🛒'; catName = 'Market/Sabji'; }
            if (subCat === 'food') { subIcon = '🍔'; catName = 'Food/Canteen'; }
            if (subCat === 'travel') { subIcon = '🚌'; catName = 'Travel/Petrol'; }
            if (subCat === 'education') { subIcon = '📚'; catName = 'College/Books'; }

            historyHTML = historyHTML + `
                <div class="sub-item">
                    <div class="sub-item-left">
                        <span style="font-size: 18px;">${subIcon}</span>
                        <div class="sub-text-group">
                            <span class="sub-cat-name">${catName}</span>
                            <span class="sub-time">${item.historyList[j].time}</span>
                        </div>
                    </div>
                    <strong>₹${item.historyList[j].paisa}</strong>
                </div>
            `;
        }

        const li = document.createElement('li');
        li.innerHTML = `
            <div class="item-main">
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
        
        expenseList.appendChild(li); 
    }

    totalAmountSpan.innerText = overallTotal;
}

form.addEventListener('submit', function(event) {
    event.preventDefault(); 

    const nameValue = expenseName.value;
    const categoryValue = expenseCategory.value; 
    const amountValue = Number(expenseAmount.value); 

    const now = new Date();
    const fullDisplayTime = now.toLocaleDateString('en-IN') + " | " + now.toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'});
    
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const monthYearValue = year + "-" + month;

    const newRecord = {
        name: nameValue,
        category: categoryValue,
        amount: amountValue,
        time: fullDisplayTime,       
        monthYear: monthYearValue    
    };

    expenses.push(newRecord);
    localStorage.setItem('myExpenses', JSON.stringify(expenses));

    expenseName.value = '';
    expenseAmount.value = '';
    
    showData();
});

monthFilterInput.addEventListener('change', function() {
    showData();
});

showData();