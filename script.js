
const $ = id => document.getElementById(id);

let foods = read("foodwise-v2-items", []);
let shopping = read("foodwise-v2-shopping", []);

const icons = {
    Fruit: "🍓", Vegetable: "🥦", Dairy: "🥛",
    "Meat / Fish": "🐟", Bakery: "🍞",
    Grains: "🌾", Other: "🥫"
};

function read(key, fallback) {
    try {
        return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch {
        return fallback;
    }
}

function days(food) {
    let today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.ceil((new Date(food.expiry + "T00:00:00") - today) / 86400000);
}

function status(food) {
    let d = days(food);
    if (d < 0) return ["Past date", "urgent"];
    if (d <= 2) return ["Use soon", "urgent"];
    if (d <= 5) return ["Coming up", "soon"];
    return ["Fresh", "fresh"];
}

function esc(text) {
    return String(text ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;",
        '"': "&quot;", "'": "&#39;"
    })[c]);
}

function save() {
    localStorage.setItem("foodwise-v2-items", JSON.stringify(foods));
    localStorage.setItem("foodwise-v2-shopping", JSON.stringify(shopping));
    render();
}

function toast(message) {
    $("toast").textContent = message;
    $("toast").classList.add("show");
    setTimeout(() => $("toast").classList.remove("show"), 1900);
}

function foodCard(food) {
    let d = days(food), s = status(food);
    let date = d < 0 ? Math.abs(d) + " day(s) past date" :
               d === 0 ? "Use today" : d + " day(s) left";

    return `<div class="food">
        <div class="food-icon">${icons[food.category] || "🥫"}</div>
        <div class="info">
            <div class="foodname">${esc(food.name)}</div>
            <div class="meta">${esc(food.quantity || "Quantity not set")} · ${date} · AED ${Number(food.price || 0).toFixed(2)}</div>
        </div>
        <span class="status ${s[1]}">${s[0]}</span>
        <button class="remove" onclick="removeFood('${food.id}')">×</button>
    </div>`;
}

function mealFor(food) {
    let meals = {
        Fruit: ["🍓", "Fruit bowl or smoothie", "Combine ripe fruit with yoghurt or oats if you have them."],
        Vegetable: ["🥦", "Quick vegetable bowl", "Use vegetables in soup, an omelette, pasta, or a stir-fry."],
        Dairy: ["🥛", "Breakfast or creamy sauce", "Use dairy in breakfast or a sauce if it is still within its safe-use guidance."],
        "Meat / Fish": ["🐟", "Plan a protein meal", "Plan a complete meal and follow safe storage and cooking guidance."],
        Bakery: ["🍞", "Toast or breadcrumbs", "Use bread in toast, croutons, or breadcrumbs if it is still suitable."],
        Grains: ["🌾", "Grain bowl", "Pair grains with vegetables and a protein you already have."],
        Other: ["🥫", "Kitchen-clear-out meal", "Build a meal around this item and other ingredients on hand."]
    };
    return meals[food.category] || meals.Other;
}

function render() {
    foods.sort((a, b) => days(a) - days(b));

    let urgent = foods.filter(f => days(f) <= 2);
    let value = foods.reduce((sum, f) => sum + Number(f.price || 0), 0);

    $("statTotal").textContent = foods.length;
    $("statUrgent").textContent = urgent.length;
    $("statValue").textContent = "AED " + Math.round(value);
    $("statShop").textContent = shopping.filter(s => !s.done).length;

    $("priorityList").innerHTML = foods.length
        ? foods.slice(0, 4).map(foodCard).join("")
        : '<div class="empty"><span>🧺</span><b>Your kitchen list is empty</b><p>Add food or load demo items.</p></div>';

    $("priorityTip").textContent = urgent.length
        ? `Start with ${urgent[0].name}. Check its condition and storage guidance; the app cannot tell whether food is safe.`
        : "Add food and its dates. Items with the shortest time left will be highlighted.";

    $("ideaTitle").textContent = foods.length
        ? mealFor(foods[0])[1] : "Build a meal from your ingredients";

    $("ideaText").textContent = foods.length
        ? mealFor(foods[0])[2] + " This is a meal idea, not a safety assessment."
        : "Your suggestions will update when you add food.";

    $("allFoods").innerHTML = foods.length
        ? foods.map(foodCard).join("")
        : '<div class="empty">No food items yet.</div>';

    $("inventoryCount").textContent = foods.length + " ITEMS";

    $("mealIdeas").innerHTML = foods.length
        ? foods.slice(0, 6).map(f => {
            let m = mealFor(f);
            return `<div class="recipe">
                <div class="pic">${m[0]}</div>
                <div><h3>${m[1]}</h3>
                <p><b>Use:</b> ${esc(f.name)}. ${m[2]}</p>
                <div class="match">${days(f) <= 2 ? "PRIORITY INGREDIENT" : "BASED ON YOUR INVENTORY"}</div>
                </div>
            </div>`;
        }).join("")
        : '<div class="empty">Add ingredients to generate meal ideas.</div>';

    renderShopping();
    renderBudget();

    let query = $("searchFood").value.toLowerCase();
    if (query) {
        let found = foods.filter(f => (f.name + " " + f.category).toLowerCase().includes(query));
        $("allFoods").innerHTML = found.length
            ? found.map(foodCard).join("")
            : '<div class="empty">No matching food found.</div>';
    }

    let duplicates = shopping.filter(s =>
        !s.done && foods.some(f => f.name.toLowerCase() === s.name.toLowerCase())
    );

    $("duplicateTip").textContent = duplicates.length
        ? "Check before buying: you already track " + duplicates.map(s => s.name).join(", ") + "."
        : "Add a shopping item and FoodWise will check whether you already have it.";
}

function renderShopping() {
    $("shopCount").textContent = shopping.filter(s => !s.done).length + " ITEMS";

    $("shoppingItems").innerHTML = shopping.length
        ? shopping.map(s => `<label class="checkrow ${s.done ? "done" : ""}">
            <input type="checkbox" ${s.done ? "checked" : ""} onchange="toggleShop('${s.id}',this.checked)">
            <span class="itemtxt">${esc(s.name)}</span>
            <button type="button" class="remove" onclick="deleteShop('${s.id}');event.preventDefault()">×</button>
        </label>`).join("")
        : '<div class="empty">Your shopping list is empty.</div>';
}

function renderBudget() {
    let value = foods.reduce((sum, f) => sum + Number(f.price || 0), 0);
    let shopValue = shopping.reduce((sum, s) => sum + Number(s.price || 0), 0);
    let budget = Number(localStorage.getItem("foodwise-budget") || 0);
    let soon = foods.filter(f => days(f) <= 3);
    let soonValue = soon.reduce((sum, f) => sum + Number(f.price || 0), 0);

    $("budgetInventory").textContent = "AED " + value.toFixed(2);
    $("budgetShopping").textContent = "AED " + shopValue.toFixed(2);
    $("monthlyBudget").value = budget || "";
    $("budgetTarget").textContent = budget ? "AED " + budget.toFixed(2) : "Not set";

    $("budgetTip").textContent = budget
        ? shopValue > budget
            ? "Your estimated list is AED " + (shopValue - budget).toFixed(2) + " over your budget target."
            : "Your estimated list is AED " + (budget - shopValue).toFixed(2) + " under your budget target."
        : "Set a budget and add estimated item prices to compare costs.";

    $("impactItems").textContent = foods.length;
    $("impactSoon").textContent = soon.length;
    $("impactValue").textContent = "AED " + soonValue.toFixed(2);
    $("impactBar").style.width = (foods.length ? Math.min(100, soon.length / foods.length * 100) : 0) + "%";
}

$("foodForm").addEventListener("submit", e => {
    e.preventDefault();
    let name = $("foodName").value.trim(), expiry = $("expiry").value;
    if (!name || !expiry) return;

    foods.push({
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2),
        name, category: $("category").value, expiry,
        price: Math.max(0, Number($("price").value) || 0),
        quantity: $("quantity").value.trim()
    });

    save();
    e.target.reset();
    $("expiry").value = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    toast("Added to your kitchen");
});

window.removeFood = id => {
    foods = foods.filter(f => f.id !== id);
    save();
    toast("Removed from inventory");
};

$("demoBtn").onclick = () => {
    let day = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

    foods = [
        {id:"demo-a", name:"Strawberries", category:"Fruit", expiry:day(1), price:12, quantity:"1 box"},
        {id:"demo-b", name:"Spinach", category:"Vegetable", expiry:day(2), price:8, quantity:"1 bag"},
        {id:"demo-c", name:"Milk", category:"Dairy", expiry:day(5), price:7, quantity:"1 carton"},
        {id:"demo-d", name:"Bread", category:"Bakery", expiry:day(4), price:6, quantity:"1 loaf"}
    ];

    shopping = [{id:"shop-demo", name:"Oats", done:false, price:8}];
    save();
    toast("Demo loaded — explore the tabs");
};

$("shopForm").addEventListener("submit", e => {
    e.preventDefault();
    let name = $("shopName").value.trim();
    if (!name) return;

    shopping.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        name, done: false, price: 0
    });

    save();
    $("shopName").value = "";
    toast("Added to shopping list");
});

window.toggleShop = (id, done) => {
    let item = shopping.find(s => s.id === id);
    if (item) item.done = done;
    save();
};

window.deleteShop = id => {
    shopping = shopping.filter(s => s.id !== id);
    save();
};

$("clearChecked").onclick = () => {
    shopping = shopping.filter(s => !s.done);
    save();
    toast("Checked items removed");
};

$("searchFood").addEventListener("input", render);

$("monthlyBudget").addEventListener("change", () => {
    localStorage.setItem("foodwise-budget", String(Math.max(0, Number($("monthlyBudget").value) || 0)));
    renderBudget();
});

document.querySelectorAll(".tab").forEach(button => {
    button.onclick = () => {
        document.querySelectorAll(".tab").forEach(tab => tab.classList.toggle("active", tab === button));
        document.querySelectorAll(".page").forEach(page => page.classList.toggle("active", page.id === button.dataset.page));
    };
});

$("expiry").value = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
render();
