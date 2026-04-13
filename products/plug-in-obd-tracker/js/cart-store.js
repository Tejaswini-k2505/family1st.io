/**
 * CartStore — localStorage-based cart that works on both Netlify and PHP server.
 * Replaces PHP session cart for static hosting.
 */
var CartStore = (function () {
    var CART_KEY = 'family1st_cart';

    function getCart() {
        try {
            var data = localStorage.getItem(CART_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    function saveCart(cart) {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
        updateBadge();
    }

    function addItem(item) {
        var cart = getCart();
        var found = false;
        for (var i = 0; i < cart.length; i++) {
            if (cart[i].productId === item.productId) {
                cart[i].qty = parseInt(item.qty) || 1;
                found = true;
                break;
            }
        }
        if (!found) {
            cart.push({
                productId: item.productId,
                name: item.name,
                price: parseFloat(item.price),
                monthlyPrice: parseFloat(item.monthlyPrice),
                image: item.image,
                qty: parseInt(item.qty) || 1
            });
        }
        saveCart(cart);
        return cart;
    }

    function updateQty(productId, qty) {
        var cart = getCart();
        qty = parseInt(qty);
        if (qty <= 0) return removeItem(productId);
        for (var i = 0; i < cart.length; i++) {
            if (cart[i].productId === productId) {
                cart[i].qty = qty;
                break;
            }
        }
        saveCart(cart);
        return cart;
    }

    function removeItem(productId) {
        var cart = getCart().filter(function (item) {
            return item.productId !== productId;
        });
        saveCart(cart);
        return cart;
    }

    function clearCart() {
        localStorage.removeItem(CART_KEY);
        updateBadge();
    }

    function getTotals() {
        var cart = getCart();
        var deviceTotal = 0, monthlyTotal = 0, totalQty = 0;
        for (var i = 0; i < cart.length; i++) {
            deviceTotal += cart[i].price * cart[i].qty;
            monthlyTotal += cart[i].monthlyPrice * cart[i].qty;
            totalQty += cart[i].qty;
        }
        return {
            items: cart,
            deviceTotal: deviceTotal,
            monthlyTotal: monthlyTotal,
            shipping: 0,
            grandTotal: deviceTotal,
            totalQty: totalQty
        };
    }

    function updateBadge() {
        var totals = getTotals();
        var badges = document.querySelectorAll('#cart-count, #mobile-cart-count');
        badges.forEach(function (badge) {
            badge.textContent = totals.totalQty;
            badge.style.display = totals.totalQty > 0 ? '' : 'none';
        });
    }

    return {
        getCart: getCart,
        addItem: addItem,
        updateQty: updateQty,
        removeItem: removeItem,
        clearCart: clearCart,
        getTotals: getTotals,
        updateBadge: updateBadge
    };
})();
