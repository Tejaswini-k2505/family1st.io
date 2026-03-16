/**
 * Family1st Checkout — Stripe payment handler
 * Works with localStorage cart (no PHP session)
 * complete.php and sendEmail.php are called on the family1st.io server
 */
(function () {
    'use strict';

    // ── Server endpoints (PHP stays on your server) ──────────────────
    var SERVER_BASE    = 'https://staging.family1st.io';
    var COMPLETE_URL   = SERVER_BASE + '/family1st-io-v2/products/monthly-subscription_v1/complete.php';
    var SEND_EMAIL_URL = SERVER_BASE + '/family1st-io-v2/products/monthly-subscription_v1/data/sendEmail.php';

    // ── Stripe publishable key ────────────────────────────────────────
    // Stripe.setPublishableKey('pk_live_ZOC4YsmfZWPKi73HTChGMM4N00XQHhEUBg');
    Stripe.setPublishableKey('pk_test_Y0yiRxEiDAF8Peh8RW2uUauj00yCH3HDCO');

    var btnText       = document.getElementById('btn-text');
    var btnSpinner    = document.getElementById('btn-spinner');
    var formError     = document.getElementById('form-error');
    var checkoutBtn   = document.getElementById('checkout-btn');
    var shipDifferent = document.getElementById('ship-different');
    var shippingFields = document.getElementById('shipping-address-fields');

    var cardNumberInput = document.getElementById('cardNumber');
    var cardExpiryInput = document.getElementById('cardExpiry');
    var cardCvvInput    = document.getElementById('cardCvv');

    var OVERNIGHT_COST = 45.00;

    if (!checkoutBtn) return; // Not on checkout page

    // ── Card number formatting ────────────────────────────────────────
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', function () {
            var val = this.value.replace(/\D/g, '').substring(0, 16);
            this.value = val.replace(/(\d{4})(?=\d)/g, '$1 ');
        });
    }

    // ── Expiry formatting MM/YY ───────────────────────────────────────
    if (cardExpiryInput) {
        cardExpiryInput.addEventListener('input', function () {
            var val = this.value.replace(/\D/g, '').substring(0, 4);
            this.value = val.length >= 3 ? val.substring(0, 2) + '/' + val.substring(2) : val;
        });
    }

    // ── CVV formatting ────────────────────────────────────────────────
    if (cardCvvInput) {
        cardCvvInput.addEventListener('input', function () {
            this.value = this.value.replace(/\D/g, '').substring(0, 4);
        });
    }

    // ── Shipping method toggle ────────────────────────────────────────
    document.querySelectorAll('input[name="shipping_method"]').forEach(function (radio) {
        radio.addEventListener('change', function () {
            var isOvernight = this.value === 'overnight';
            var optFree      = document.getElementById('shipping-option-free');
            var optOvernight = document.getElementById('shipping-option-overnight');
            var summaryShip  = document.getElementById('summary-shipping');
            var summaryTotal = document.getElementById('summary-total');

            if (optFree)      optFree.classList.toggle('shipping-option--active', !isOvernight);
            if (optOvernight) optOvernight.classList.toggle('shipping-option--active', isOvernight);

            var shipping   = isOvernight ? OVERNIGHT_COST : 0;
            var totals     = Cart.getTotals();
            var grandTotal = totals.deviceTotal + shipping;

            if (summaryShip) {
                summaryShip.textContent = isOvernight ? '$' + OVERNIGHT_COST.toFixed(2) : 'FREE';
                summaryShip.classList.toggle('order-pricing__free', !isOvernight);
            }
            if (summaryTotal) summaryTotal.textContent = '$' + grandTotal.toFixed(2);
        });
    });

    // ── Ship to different address toggle ──────────────────────────────
    if (shipDifferent && shippingFields) {
        shipDifferent.addEventListener('change', function () {
            shippingFields.style.display = this.checked ? '' : 'none';
            shippingFields.querySelectorAll('input, select').forEach(function (input) {
                if (shipDifferent.checked) {
                    input.setAttribute('required', '');
                } else {
                    input.removeAttribute('required');
                    input.classList.remove('input-error');
                }
            });
        });
    }

    // ── Error helpers ─────────────────────────────────────────────────
    function showError(msg) {
        if (!formError) return;
        formError.textContent = msg;
        formError.hidden = false;
        formError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    function hideError() {
        if (formError) { formError.textContent = ''; formError.hidden = true; }
    }

    // Clear errors on input
    document.querySelectorAll('#checkout-form input, #checkout-form select').forEach(function (field) {
        field.addEventListener('input', function () {
            this.classList.remove('input-error');
            if (!document.querySelector('.input-error')) hideError();
        });
        field.addEventListener('change', function () {
            this.classList.remove('input-error');
            if (!document.querySelector('.input-error')) hideError();
        });
    });

    // ── Loading state ─────────────────────────────────────────────────
    function setLoading(loading) {
        checkoutBtn.disabled = loading;
        if (btnText)    btnText.textContent = loading ? 'Processing…' : 'Place Order';
        if (btnSpinner) btnSpinner.hidden   = !loading;
    }

    // ── Get active shipping cost ──────────────────────────────────────
    function getShippingCost() {
        var checked = document.querySelector('input[name="shipping_method"]:checked');
        return (checked && checked.value === 'overnight') ? OVERNIGHT_COST : 0;
    }

    // ── Field helper ──────────────────────────────────────────────────
    function val(id) {
        var el = document.getElementById(id);
        return el ? el.value.trim() : '';
    }

    // ── Validation ────────────────────────────────────────────────────
    function validateForm() {
        var required = ['full-name', 'email', 'phone', 'address', 'city', 'state', 'zip',
                        'cardNumber', 'cardExpiry', 'cardCvv', 'cardholderName'];
        var firstInvalid = null;

        required.forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.classList.remove('input-error');
        });

        required.forEach(function (id) {
            var el = document.getElementById(id);
            if (!el || !el.value.trim()) {
                if (el) { el.classList.add('input-error'); if (!firstInvalid) firstInvalid = el; }
            }
        });

        // Email format
        var emailEl = document.getElementById('email');
        if (emailEl && emailEl.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value.trim())) {
            emailEl.classList.add('input-error');
            if (!firstInvalid) firstInvalid = emailEl;
        }

        // Card number 13-16 digits
        if (cardNumberInput) {
            var cn = cardNumberInput.value.replace(/\s/g, '');
            if (cn.length < 13 || cn.length > 16) {
                cardNumberInput.classList.add('input-error');
                if (!firstInvalid) firstInvalid = cardNumberInput;
            }
        }

        // Expiry MM/YY
        if (cardExpiryInput && !/^\d{2}\/\d{2}$/.test(cardExpiryInput.value.trim())) {
            cardExpiryInput.classList.add('input-error');
            if (!firstInvalid) firstInvalid = cardExpiryInput;
        }

        // CVV 3-4 digits
        if (cardCvvInput) {
            var cvv = cardCvvInput.value.trim();
            if (cvv.length < 3 || cvv.length > 4) {
                cardCvvInput.classList.add('input-error');
                if (!firstInvalid) firstInvalid = cardCvvInput;
            }
        }

        if (firstInvalid) {
            firstInvalid.focus();
            showError('Please fill in all required fields correctly.');
            return false;
        }
        return true;
    }

    // ── Place Order click ─────────────────────────────────────────────
    checkoutBtn.addEventListener('click', function () {
        hideError();

        var items = Cart.getItems();
        if (!items || items.length === 0) {
            showError('Your cart is empty.');
            return;
        }

        if (!validateForm()) return;

        setLoading(true);

        // Parse expiry
        var expiryParts = cardExpiryInput.value.trim().split('/');
        var expMonth = parseInt(expiryParts[0], 10);
        var expYear  = parseInt(expiryParts[1], 10);

        // Create Stripe token
        Stripe.card.createToken({
            number:    cardNumberInput.value.replace(/\s/g, ''),
            exp_month: expMonth,
            exp_year:  expYear,
            cvc:       cardCvvInput.value.trim(),
            name:      val('cardholderName')
        }, function (status, response) {
            if (response.error) {
                setLoading(false);
                showError(response.error.message);
                return;
            }
            submitOrder(response.id, items);
        });
    });

    // ── Submit order to complete.php on server ────────────────────────
    function submitOrder(stripeToken, items) {
        var shipping   = getShippingCost();
        var totals     = Cart.getTotals();
        var grandTotal = totals.deviceTotal + shipping;

        var data = new FormData();
        data.append('stripeToken',      stripeToken);
        data.append('name',             val('full-name'));
        data.append('email',            val('email'));
        data.append('phone',            val('phone'));
        data.append('address',          val('address'));
        data.append('city',             val('city'));
        data.append('state',            val('state'));
        data.append('zip',              val('zip'));
        data.append('country',          val('country') || 'US');
        data.append('shipping_method',  document.querySelector('input[name="shipping_method"]:checked').value);
        data.append('shipping_cost',    shipping.toFixed(2));
        data.append('device_total',     totals.deviceTotal.toFixed(2));
        data.append('grand_total',      grandTotal.toFixed(2));

        // Send cart as JSON (complete.php will use this since no $_SESSION on Netlify)
        data.append('cart', JSON.stringify(items));

        // Billing address
        data.append('bstreet',  val('address'));
        data.append('bcity',    val('city'));
        data.append('bstate',   val('state'));
        data.append('bzipcode', val('zip'));
        data.append('bcountry', val('country') || 'US');

        // Shipping address
        var useDiffShip = shipDifferent && shipDifferent.checked;
        if (useDiffShip) {
            data.append('ship_different', '1');
            data.append('ship_address',   val('ship-address'));
            data.append('ship_city',      val('ship-city'));
            data.append('ship_state',     val('ship-state'));
            data.append('ship_zip',       val('ship-zip'));
            data.append('ship_country',   val('ship-country') || 'US');
            data.append('sstreet',        val('ship-address'));
            data.append('scity',          val('ship-city'));
            data.append('sstate',         val('ship-state'));
            data.append('szipcode',       val('ship-zip'));
            data.append('scountry',       val('ship-country') || 'US');
        } else {
            data.append('sstreet',  val('address'));
            data.append('scity',    val('city'));
            data.append('sstate',   val('state'));
            data.append('szipcode', val('zip'));
            data.append('scountry', val('country') || 'US');
        }

        var xhr = new XMLHttpRequest();
        xhr.open('POST', COMPLETE_URL, true);
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

        xhr.onload = function () {
            try {
                var result = JSON.parse(xhr.responseText);
                if (result.status) {
                    Cart.clear();
                    sendOrderEmail(result, grandTotal, function () {
                        redirectToSuccess(result);
                    });
                } else {
                    setLoading(false);
                    showError(result.message || 'Payment failed. Please try again.');
                }
            } catch (e) {
                setLoading(false);
                showError('An unexpected error occurred. Please try again.');
            }
        };

        xhr.onerror = function () {
            setLoading(false);
            showError('Network error. Please check your connection and try again.');
        };

        xhr.send(data);
    }

    // ── Send order confirmation email via sendEmail.php on server ─────
    function sendOrderEmail(result, grandTotal, callback) {
        var fullName   = val('full-name');
        var nameParts  = fullName.split(' ');
        var fname      = nameParts[0] || '';
        var lname      = nameParts.slice(1).join(' ') || '';

        var emailData = new FormData();
        emailData.append('email',            val('email'));
        emailData.append('fname',            fname);
        emailData.append('lname',            lname);
        emailData.append('phone',            val('phone'));
        emailData.append('orderToken',       result.charge_id || '');
        emailData.append('customerStripeId', result.customer_id || '');
        emailData.append('shippingAmount',   result.shipping_amount || '0.00');
        emailData.append('tax',              result.tax || 0);
        emailData.append('taxAmount',        result.tax_amount || '0.00');
        emailData.append('totsubdev',        result.amount || grandTotal.toFixed(2));

        // Billing address
        emailData.append('bstreet',  val('address'));
        emailData.append('bcity',    val('city'));
        emailData.append('bstate',   val('state'));
        emailData.append('bzipcode', val('zip'));
        emailData.append('bcountry', val('country') || 'US');

        // Shipping address
        var useDiffShip = shipDifferent && shipDifferent.checked;
        if (useDiffShip) {
            emailData.append('sstreet',  val('ship-address'));
            emailData.append('scity',    val('ship-city'));
            emailData.append('sstate',   val('ship-state'));
            emailData.append('szipcode', val('ship-zip'));
            emailData.append('scountry', val('ship-country') || 'US');
        } else {
            emailData.append('sstreet',  val('address'));
            emailData.append('scity',    val('city'));
            emailData.append('sstate',   val('state'));
            emailData.append('szipcode', val('zip'));
            emailData.append('scountry', val('country') || 'US');
        }

        // Product data for email
        var productData = result.product_data || [];
        productData.forEach(function (p, i) {
            emailData.append('productData[' + i + '][productName]', p.productName);
            emailData.append('productData[' + i + '][quantity]',    p.quantity);
            emailData.append('productData[' + i + '][price]',       p.price);
            emailData.append('productData[' + i + '][plan]',        p.plan);
        });

        // Invoice data from successful subscriptions
        var successfulSubs = result.successful_subs || [];
        successfulSubs.forEach(function (sub, j) {
            emailData.append('invoice[' + j + '][invoice]', sub.invoice || '');
        });

        var xhr = new XMLHttpRequest();
        xhr.open('POST', SEND_EMAIL_URL, true);
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        xhr.onload  = function () { callback(); }; // always proceed
        xhr.onerror = function () { callback(); }; // don't block on email failure
        xhr.send(emailData);
    }

    // ── Redirect to success.html with URL params ──────────────────────
    function redirectToSuccess(result) {
        var successfulSubs = result.successful_subs || [];
        var failedSubs     = result.failed_subs || [];
        var isPartial      = failedSubs.length > 0 && successfulSubs.length > 0;

        var params = new URLSearchParams();
        params.set('orderToken',  result.charge_id || '');
        params.set('successful',  successfulSubs.length);
        params.set('failed',      failedSubs.length);

        if (isPartial) {
            params.set('status',  'partial');
            params.set('message', 'Some subscriptions could not be activated.');
        }
        if (successfulSubs.length > 0) {
            params.set('successful_subs', encodeURIComponent(JSON.stringify(successfulSubs)));
        }
        if (failedSubs.length > 0) {
            params.set('failed_subs', encodeURIComponent(JSON.stringify(failedSubs)));
        }

        window.location.href = 'success.html?' + params.toString();
    }

})();