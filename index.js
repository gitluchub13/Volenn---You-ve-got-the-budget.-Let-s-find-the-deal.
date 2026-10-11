// Base ("typical") price for each product, before store/zone price differences are applied.
const productBasePrices = {
    Milk: 1.15,
    'Olive oil': 6.95,
    Bread: 0.95,
    Eggs: 2.30,
    Rice: 1.45,
    Pasta: 0.95,
    'Coca-Cola': 2.15,
    Chicken: 7.80,
    Bananas: 1.70,
    Apples: 2.20,
    Water: 0.42,
    Coffee: 1.10,
    Beer: 0.75,
    Sandwich: 3.50,
    Yogurt: 2.60,
    Cheese: 4.20,
    Tomatoes: 1.90,
    Potatoes: 1.10,
    'Orange juice': 1.80,
    Wine: 4.50,
    Croissant: 0.95,
    'Jamón': 12.50,
    Tuna: 1.60,
    Chips: 1.75,
};

// How much pricier or cheaper each store tends to run, relative to the base price.
const storeMultipliers = {
    Mercadona: 1.00,
    Lidl: 0.95,
    Carrefour: 1.12,
    Aldi: 0.96,
    Dia: 0.99,
    Condis: 1.06,
    Caprabo: 1.10,
    'Local shop': 1.35,
};

// How much pricier or cheaper each neighborhood tends to run (touristy zones cost more).
const zoneMultipliers = {
    Eixample: 1.03,
    'Gràcia': 0.99,
    Raval: 1.08,
    Barceloneta: 1.18,
    Sants: 0.95,
};

const zones = Object.keys(zoneMultipliers);
const storeNames = Object.keys(storeMultipliers);

// Builds one price listing for every product x zone x store combination,
// so every product shows up in every neighborhood and at every store.
function buildProducts() {
    const list = [];
    let id = 1;

    Object.keys(productBasePrices).forEach(function (name) {
        const basePrice = productBasePrices[name];

        zones.forEach(function (zone) {
            storeNames.forEach(function (store) {
                const price = Math.round(basePrice * storeMultipliers[store] * zoneMultipliers[zone] * 100) / 100;
                list.push({ id: id++, name: name, zone: zone, store: store, price: price });
            });
        });
    });

    return list;
}

const products = buildProducts();

function toggleFaq(button) {
    button.parentElement.classList.toggle('open');
}

function scrollToPathSection() {
    const section = document.getElementById('pathSectionAnchor');
    if (!section) return;
    section.scrollIntoView({ behavior: 'smooth' });
}

// Sends the waitlist form to Formspree (its `action` URL) in the background,
// so the visitor never leaves the page.
function submitWaitlist(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const container = form.closest('.pathSignup');
    const buttonLabel = form.querySelector('.waitlistSubmit .waitlistCtaInner');
    const button = form.querySelector('.waitlistSubmit');
    const errorEl = form.querySelector('.waitlistError');
    const originalLabel = buttonLabel.innerHTML;

    errorEl.hidden = true;
    button.disabled = true;
    buttonLabel.textContent = 'Joining…';

    fetch(form.action, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form),
    })
        .then(function (response) {
            if (response.ok) return;
            // Formspree returns { errors: [{ message }] } for bad input; anything else gets a generic message.
            return response.json()
                .catch(function () { return {}; })
                .then(function (data) {
                    const errors = data.errors || [];
                    const isEmailError = errors.some(function (err) { return err.field === 'email'; });
                    throw new Error(isEmailError
                        ? "That email doesn't look quite right — mind double-checking it?"
                        : 'Something went wrong on our side. Please try again in a moment.');
                });
        })
        .then(function () {
            showWaitlistSuccess(container);
        })
        .catch(function (error) {
            errorEl.textContent = error instanceof TypeError
                ? "Couldn't reach the server — check your connection and try again."
                : error.message;
            errorEl.hidden = false;
            button.disabled = false;
            buttonLabel.innerHTML = originalLabel;
        });
}

function showWaitlistSuccess(container) {
    // Hold the card's height so the page doesn't jump when the form is swapped out.
    container.style.minHeight = container.offsetHeight + 'px';
    container.classList.add('isLeaving');

    setTimeout(function () {
        container.classList.remove('isLeaving');
        container.classList.add('isSuccess');
        container.innerHTML =
            '<div class="waitlistSuccess" role="status">' +
            '<span class="waitlistSuccessBadge" aria-hidden="true">' +
            '<span class="waitlistConfetti"></span><span class="waitlistConfetti"></span>' +
            '<span class="waitlistConfetti"></span><span class="waitlistConfetti"></span>' +
            '<svg viewBox="0 0 24 24" fill="none"><path class="waitlistSuccessCheck" d="m6.5 12.5 3.6 3.6 7.4-8.2" ' +
            'stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '</span>' +
            '<h3 class="waitlistSuccessTitle">You\'re on the list!</h3>' +
            '<p class="waitlistSuccessText">Thanks for joining Volenn. We\'ll email you the moment early access opens — your wallet says thanks in advance.</p>' +
            '</div>';
    }, 220);
}

function pickReceiptItems() {
    const names = products
        .map(function (product) { return product.name; })
        .filter(function (name, index, all) { return all.indexOf(name) === index; });
    const shuffledNames = names.slice().sort(function () { return Math.random() - 0.5; });

    return shuffledNames.slice(0, 3).map(function (name) {
        const matches = products.filter(function (product) { return product.name === name; });
        const cheapest = matches.reduce(function (best, product) {
            return product.price < best.price ? product : best;
        });
        const priciest = matches.reduce(function (best, product) {
            return product.price > best.price ? product : best;
        });
        return { name: name, oldPrice: priciest.price, newPrice: cheapest.price };
    });
}

function renderReceipt() {
    const linesEl = document.getElementById('receiptLines');
    const totalEl = document.getElementById('receiptTotalValue');
    if (!linesEl || !totalEl) return;

    const items = pickReceiptItems();

    linesEl.innerHTML = items.map(function (item) {
        return '<div class="receiptLine">' +
            '<span class="receiptItemName">' + item.name + '</span>' +
            '<span class="receiptItemPrices">' +
            '<span class="receiptOldPrice">€' + item.oldPrice.toFixed(2) + '</span>' +
            '<span class="receiptNewPrice">€' + item.newPrice.toFixed(2) + '</span>' +
            '</span>' +
            '</div>';
    }).join('');

    const totalSavings = items.reduce(function (sum, item) {
        return sum + (item.oldPrice - item.newPrice);
    }, 0);
    totalEl.textContent = '€' + totalSavings.toFixed(2);
}

// Builds the same wandering-path formula as the reference "Background Paths"
// component, mirrored (position 1 / -1) into two overlapping sets of lines.
function buildFloatingPaths(position) {
    const paths = [];
    for (let i = 0; i < 24; i++) {
        const d = 'M-' + (380 - i * 5 * position) + ' -' + (189 + i * 6) +
            'C-' + (380 - i * 5 * position) + ' -' + (189 + i * 6) +
            ' -' + (312 - i * 5 * position) + ' ' + (216 - i * 6) +
            ' ' + (152 - i * 5 * position) + ' ' + (343 - i * 6) +
            'C' + (616 - i * 5 * position) + ' ' + (470 - i * 6) +
            ' ' + (684 - i * 5 * position) + ' ' + (875 - i * 6) +
            ' ' + (684 - i * 5 * position) + ' ' + (875 - i * 6);
        paths.push({ d: d, width: 0.5 + i * 0.03, opacity: 0.05 + i * 0.01 });
    }
    return paths;
}

function renderPathBackground() {
    const svgEl = document.getElementById('pathBackgroundSvg');
    if (!svgEl) return;

    const markup = [1, -1].map(function (position) {
        return buildFloatingPaths(position).map(function (path, index) {
            const delay = (index % 12) * -1.4;
            const duration = 14 + Math.random() * 10;
            return '<path d="' + path.d + '" stroke="currentColor" stroke-width="' + path.width.toFixed(2) +
                '" stroke-opacity="' + path.opacity.toFixed(3) + '" fill="none" class="bgPathLine" ' +
                'style="animation-duration:' + duration.toFixed(1) + 's;animation-delay:' + delay.toFixed(1) + 's"></path>';
        }).join('');
    }).join('');

    svgEl.innerHTML = markup;
}

function cycleHeroTip() {
    const el = document.getElementById('heroTipText');
    if (!el) return;

    const names = products
        .map(function (product) { return product.name; })
        .filter(function (name, index, all) { return all.indexOf(name) === index; });
    const name = names[Math.floor(Math.random() * names.length)];
    const matches = products.filter(function (product) { return product.name === name; });
    const cheapest = matches.reduce(function (best, product) {
        return product.price < best.price ? product : best;
    });
    const priciest = matches.reduce(function (best, product) {
        return product.price > best.price ? product : best;
    });

    el.textContent = name + ': €' + cheapest.price.toFixed(2) + ' at ' + cheapest.store +
        ' vs up to €' + priciest.price.toFixed(2) + ' elsewhere in the city.';
}

function selectMilestone(index) {
    const items = document.querySelectorAll('.pathMilestone');
    items.forEach(function (item, i) {
        item.classList.toggle('active', i === index);
    });
}

function handleGoogleSignIn() {
    const note = document.getElementById('pathGoogleNote');
    if (!note) return;
    note.textContent = "Google sign-in isn't connected yet — use the form above for now.";
    note.hidden = false;
}

function spawnRipple(event) {
    const button = event.currentTarget;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'shinyCtaRipple';
    ripple.style.width = '18px';
    ripple.style.height = '18px';
    ripple.style.left = (event.clientX - rect.left) + 'px';
    ripple.style.top = (event.clientY - rect.top) + 'px';

    button.appendChild(ripple);
    setTimeout(function () { ripple.remove(); }, 650);
}

function renderFooterCopyright() {
    const el = document.getElementById('footerCopyright');
    if (!el) return;
    el.textContent = '© ' + new Date().getFullYear() + ' Volenn';
}

document.addEventListener('DOMContentLoaded', function () {
    renderReceipt();
    renderPathBackground();
    renderFooterCopyright();
    cycleHeroTip();

    const waitlistForm = document.getElementById('pathWaitlistForm');
    if (waitlistForm) waitlistForm.addEventListener('submit', submitWaitlist);

    const revealEls = document.querySelectorAll('.revealOnScroll');
    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });
    revealEls.forEach(function (el) {
        observer.observe(el);
    });
});