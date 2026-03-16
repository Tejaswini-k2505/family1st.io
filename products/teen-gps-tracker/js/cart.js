// ============================================================
// Family1st Cart — localStorage-based cart (replaces PHP sessions)
// ============================================================

var Cart = (function () {
    var STORAGE_KEY = 'family1st_cart';

    function getItems() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch (e) {
            return [];
        }
    }

    function saveItems(items) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }

    function addItem(product) {
        var items = getItems();
        var existing = items.find(function (i) { return i.productId === product.productId; });
        if (existing) {
            existing.qty += (product.qty || 1);
        } else {
            items.push({
                productId: product.productId,
                name: product.name,
                price: product.price,
                monthlyPrice: product.monthlyPrice,
                image: product.image,
                qty: product.qty || 1
            });
        }
        saveItems(items);
        updateCartBadges();
    }

    function updateQty(productId, qty) {
        var items = getItems();
        if (qty <= 0) {
            items = items.filter(function (i) { return i.productId !== productId; });
        } else {
            var item = items.find(function (i) { return i.productId === productId; });
            if (item) item.qty = qty;
        }
        saveItems(items);
        updateCartBadges();
        return buildTotals(items);
    }

    function removeItem(productId) {
        var items = getItems().filter(function (i) { return i.productId !== productId; });
        saveItems(items);
        updateCartBadges();
        return buildTotals(items);
    }

    function buildTotals(items) {
        var deviceTotal = 0, monthlyTotal = 0, totalQty = 0;
        items.forEach(function (i) {
            deviceTotal += i.price * i.qty;
            monthlyTotal += (i.monthlyPrice || 0) * i.qty;
            totalQty += i.qty;
        });
        return { items: items, deviceTotal: deviceTotal, monthlyTotal: monthlyTotal, totalQty: totalQty };
    }

    function getTotals() {
        return buildTotals(getItems());
    }

    function clear() {
        localStorage.removeItem(STORAGE_KEY);
        updateCartBadges();
    }

    function updateCartBadges() {
        var totals = getTotals();
        var count = totals.totalQty;
        document.querySelectorAll('#cart-count, #mobile-cart-count').forEach(function (el) {
            el.textContent = count;
            if (el.id === 'cart-count') el.style.display = count > 0 ? '' : 'none';
        });
    }

    return { getItems, addItem, updateQty, removeItem, getTotals, clear, updateCartBadges };
})();

// Update badges on every page load
document.addEventListener('DOMContentLoaded', function () {
    Cart.updateCartBadges();
});