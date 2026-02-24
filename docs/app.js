// Minishop demo (static) — no backend, no real payments.

const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

const CATEGORIES = [
  { id: 'all', name: 'Tất cả' },
  { id: 'electronics', name: 'Điện tử' },
  { id: 'home', name: 'Nhà cửa' },
  { id: 'fashion', name: 'Thời trang' },
  { id: 'beauty', name: 'Làm đẹp' },
  { id: 'sports', name: 'Thể thao' },
];

const PRODUCTS = [
  mkProduct('p01', 'Tai nghe Bluetooth', 'electronics', 249000, 4.7, '🎧', 'Tai nghe pin trâu, độ trễ thấp. Demo thôi nhưng cảm giác “xịn”.'),
  mkProduct('p02', 'Chuột không dây', 'electronics', 159000, 4.5, '🖱️', 'Click êm, phù hợp học tập và làm việc.'),
  mkProduct('p03', 'Đèn ngủ LED', 'home', 129000, 4.6, '💡', 'Ánh sáng dịu, nhiều chế độ. Tặng kèm “vibe”.'),
  mkProduct('p04', 'Bình giữ nhiệt', 'home', 199000, 4.4, '🧊', 'Giữ nóng/lạnh ổn. Đặt tên bình là “hạnh phúc”.'),
  mkProduct('p05', 'Áo thun basic', 'fashion', 99000, 4.3, '👕', 'Form dễ mặc, màu dễ phối. “Shopee vibe” nhẹ.'),
  mkProduct('p06', 'Sneaker trắng', 'fashion', 399000, 4.8, '👟', 'Trắng tinh, đi đâu cũng hợp. (Demo, đừng hỏi size)'),
  mkProduct('p07', 'Sữa rửa mặt', 'beauty', 179000, 4.5, '🧴', 'Làm sạch dịu nhẹ. Không thay thế tư vấn da liễu.'),
  mkProduct('p08', 'Son tint', 'beauty', 219000, 4.6, '💄', 'Màu lên chuẩn, bền. Demo không thử lên môi.'),
  mkProduct('p09', 'Dây kháng lực', 'sports', 89000, 4.4, '🏋️', 'Tập tại nhà nhanh gọn.'),
  mkProduct('p10', 'Bình nước thể thao', 'sports', 69000, 4.2, '🚰', 'Nhẹ, tiện mang theo.'),
  mkProduct('p11', 'Bàn phím cơ mini', 'electronics', 549000, 4.7, '⌨️', 'Gõ “cạch cạch” đã tai. (Demo, không chọn switch)'),
  mkProduct('p12', 'Gối tựa lưng', 'home', 149000, 4.1, '🛋️', 'Ngồi lâu đỡ mỏi. Lưu ý tư thế.'),
];

function mkProduct(id, name, category, price, rating, emoji, desc) {
  return {
    id,
    name,
    category,
    price,
    rating,
    sold: randInt(120, 9800),
    emoji,
    desc,
    shop: pick(['Minishop Mall', 'Deal Ngon 24h', 'Shop Chính Hãng (demo)', 'Góc Tiện Nghi', 'Đồ Xinh Xắn']),
  };
}

function randInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const state = {
  q: '',
  category: 'all',
  sort: 'popular',
  minPrice: null,
  maxPrice: null,
};

const els = {
  categories: document.getElementById('categories'),
  chips: document.getElementById('chips'),
  grid: document.getElementById('grid'),
  resultsMeta: document.getElementById('resultsMeta'),
  q: document.getElementById('q'),
  searchForm: document.getElementById('searchForm'),
  categorySelect: document.getElementById('categorySelect'),
  sortSelect: document.getElementById('sortSelect'),
  minPrice: document.getElementById('minPrice'),
  maxPrice: document.getElementById('maxPrice'),
  applyFilters: document.getElementById('applyFilters'),
  resetFilters: document.getElementById('resetFilters'),
  productDialog: document.getElementById('productDialog'),
  productView: document.getElementById('productView'),
  cartBtn: document.getElementById('cartBtn'),
  cartDialog: document.getElementById('cartDialog'),
  cartItems: document.getElementById('cartItems'),
  cartSubtotal: document.getElementById('cartSubtotal'),
  cartTotal: document.getElementById('cartTotal'),
  cartCount: document.getElementById('cartCount'),
  checkoutBtn: document.getElementById('checkoutBtn'),
  checkoutDialog: document.getElementById('checkoutDialog'),
  checkoutForm: document.getElementById('checkoutForm'),
  toast: document.getElementById('toast'),
};

const CART_KEY = 'minishop.cart.v1';

function loadCart() {
  try {
    const v = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    if (Array.isArray(v)) return v;
  } catch {}
  return [];
}
function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}
function cartCount(cart) {
  return cart.reduce((s, it) => s + it.qty, 0);
}

function addToCart(productId, qty = 1) {
  const cart = loadCart();
  const hit = cart.find(it => it.id === productId);
  if (hit) hit.qty += qty;
  else cart.push({ id: productId, qty });
  saveCart(cart);
  syncCartBadge();
  toast('Đã thêm vào giỏ hàng');
}

function setQty(productId, qty) {
  const cart = loadCart();
  const hit = cart.find(it => it.id === productId);
  if (!hit) return;
  hit.qty = Math.max(1, qty);
  saveCart(cart);
  renderCart();
  syncCartBadge();
}

function removeItem(productId) {
  const cart = loadCart().filter(it => it.id !== productId);
  saveCart(cart);
  renderCart();
  syncCartBadge();
}

function subtotal(cart) {
  return cart.reduce((s, it) => {
    const p = PRODUCTS.find(x => x.id === it.id);
    return s + (p ? p.price * it.qty : 0);
  }, 0);
}

function syncCartBadge() {
  els.cartCount.textContent = String(cartCount(loadCart()));
}

function setCategory(catId) {
  state.category = catId;
  state.q = els.q.value.trim();
  updateCategoryUI();
  render();
}

function updateCategoryUI() {
  [...els.categories.querySelectorAll('.chip')].forEach(btn => {
    btn.classList.toggle('chip--active', btn.dataset.cat === state.category);
  });
  els.categorySelect.value = state.category;
}

function setupCategories() {
  // chips top
  els.categories.innerHTML = '';
  els.chips.innerHTML = '';

  for (const c of CATEGORIES) {
    const b = document.createElement('button');
    b.className = 'chip';
    b.type = 'button';
    b.textContent = c.name;
    b.dataset.cat = c.id;
    b.addEventListener('click', () => setCategory(c.id));
    els.categories.appendChild(b);

    const b2 = document.createElement('button');
    b2.className = 'chip';
    b2.type = 'button';
    b2.textContent = c.name;
    b2.dataset.cat = c.id;
    b2.addEventListener('click', () => setCategory(c.id));
    els.chips.appendChild(b2);
  }

  // select
  els.categorySelect.innerHTML = '';
  for (const c of CATEGORIES) {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    els.categorySelect.appendChild(opt);
  }
}

function applyFilters() {
  state.q = els.q.value.trim();
  state.category = els.categorySelect.value;
  state.sort = els.sortSelect.value;

  const min = els.minPrice.value.trim();
  const max = els.maxPrice.value.trim();
  state.minPrice = min ? Number(min) : null;
  state.maxPrice = max ? Number(max) : null;

  updateCategoryUI();
  render();
}

function resetFilters() {
  state.q = '';
  state.category = 'all';
  state.sort = 'popular';
  state.minPrice = null;
  state.maxPrice = null;
  els.q.value = '';
  els.minPrice.value = '';
  els.maxPrice.value = '';
  els.sortSelect.value = 'popular';
  els.categorySelect.value = 'all';
  updateCategoryUI();
  render();
}

function matches(p) {
  if (state.category !== 'all' && p.category !== state.category) return false;
  if (state.q) {
    const t = (p.name + ' ' + p.shop).toLowerCase();
    if (!t.includes(state.q.toLowerCase())) return false;
  }
  if (state.minPrice != null && p.price < state.minPrice) return false;
  if (state.maxPrice != null && p.price > state.maxPrice) return false;
  return true;
}

function sortProducts(list) {
  const out = [...list];
  switch (state.sort) {
    case 'priceAsc': out.sort((a,b)=>a.price-b.price); break;
    case 'priceDesc': out.sort((a,b)=>b.price-a.price); break;
    case 'ratingDesc': out.sort((a,b)=>b.rating-a.rating); break;
    default:
      // "popular": sold desc, rating desc
      out.sort((a,b)=> (b.sold - a.sold) || (b.rating - a.rating));
  }
  return out;
}

function render() {
  const filtered = PRODUCTS.filter(matches);
  const sorted = sortProducts(filtered);

  els.resultsMeta.textContent = `Kết quả: ${sorted.length} sản phẩm` + (state.q ? ` · Từ khóa: "${state.q}"` : '');
  els.grid.innerHTML = '';

  for (const p of sorted) {
    const card = document.createElement('article');
    card.className = 'card';

    const img = document.createElement('div');
    img.className = 'card__img';
    img.textContent = p.emoji;

    const body = document.createElement('div');
    body.className = 'card__body';

    const title = document.createElement('div');
    title.className = 'card__title';
    title.textContent = p.name;

    const meta = document.createElement('div');
    meta.className = 'card__meta';
    meta.innerHTML = `<span>⭐ ${p.rating.toFixed(1)} · Đã bán ${formatSold(p.sold)}</span><span class="badge">${categoryName(p.category)}</span>`;

    const price = document.createElement('div');
    price.className = 'price';
    price.textContent = currency.format(p.price);

    const actions = document.createElement('div');
    actions.className = 'card__actions';

    const viewBtn = document.createElement('button');
    viewBtn.className = 'btn btn--ghost';
    viewBtn.type = 'button';
    viewBtn.textContent = 'Xem';
    viewBtn.addEventListener('click', () => openProduct(p.id));

    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn--primary';
    addBtn.type = 'button';
    addBtn.textContent = 'Thêm';
    addBtn.addEventListener('click', () => addToCart(p.id, 1));

    actions.appendChild(viewBtn);
    actions.appendChild(addBtn);

    body.appendChild(title);
    body.appendChild(meta);
    body.appendChild(price);
    body.appendChild(actions);

    card.appendChild(img);
    card.appendChild(body);

    els.grid.appendChild(card);
  }
}

function formatSold(n) {
  if (n >= 1000) return `${(n/1000).toFixed(1)}k`;
  return String(n);
}

function categoryName(id) {
  return CATEGORIES.find(c => c.id === id)?.name || id;
}

function openProduct(id) {
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) return;

  els.productView.innerHTML = `
    <div class="productView__img" aria-hidden="true">${p.emoji}</div>
    <div>
      <h2 class="productView__title">${escapeHtml(p.name)}</h2>
      <div class="productView__row">
        <span class="rating">⭐ ${p.rating.toFixed(1)}</span>
        <span class="badge">${escapeHtml(p.shop)}</span>
        <span class="badge">Đã bán ${formatSold(p.sold)}</span>
      </div>
      <p class="productView__desc">${escapeHtml(p.desc)}</p>
      <div class="productView__row">
        <div class="price" style="font-size:22px">${currency.format(p.price)}</div>
        <button class="btn btn--primary" type="button" id="addFromDetail">Thêm vào giỏ</button>
        <button class="btn" type="button" id="buyNow">Mua ngay</button>
      </div>
      <p class="muted">Demo: “Mua ngay” sẽ thêm 1 sản phẩm rồi mở giỏ hàng.</p>
    </div>
  `;

  els.productDialog.showModal();

  els.productView.querySelector('#addFromDetail').addEventListener('click', () => addToCart(p.id, 1));
  els.productView.querySelector('#buyNow').addEventListener('click', () => {
    addToCart(p.id, 1);
    els.productDialog.close();
    openCart();
  });
}

function openCart() {
  renderCart();
  els.cartDialog.showModal();
}

function renderCart() {
  const cart = loadCart();
  els.cartItems.innerHTML = '';

  if (!cart.length) {
    els.cartItems.innerHTML = `<p class="muted">Giỏ hàng đang trống. Thêm vài món thử nhé.</p>`;
  } else {
    for (const it of cart) {
      const p = PRODUCTS.find(x => x.id === it.id);
      if (!p) continue;

      const row = document.createElement('div');
      row.className = 'cartItem';
      row.innerHTML = `
        <div class="cartItem__img" aria-hidden="true">${p.emoji}</div>
        <div class="cartItem__info">
          <div class="cartItem__name">${escapeHtml(p.name)}</div>
          <div class="cartItem__sub">${currency.format(p.price)} · ${escapeHtml(p.shop)}</div>
        </div>
        <div class="qty" aria-label="Số lượng">
          <button type="button" data-act="dec">−</button>
          <span>${it.qty}</span>
          <button type="button" data-act="inc">+</button>
        </div>
        <button class="btn btn--ghost" type="button" data-act="remove">Xóa</button>
      `;

      row.querySelector('[data-act="dec"]').addEventListener('click', () => setQty(p.id, it.qty - 1));
      row.querySelector('[data-act="inc"]').addEventListener('click', () => setQty(p.id, it.qty + 1));
      row.querySelector('[data-act="remove"]').addEventListener('click', () => removeItem(p.id));

      els.cartItems.appendChild(row);
    }
  }

  const sub = subtotal(cart);
  els.cartSubtotal.textContent = currency.format(sub);
  els.cartTotal.textContent = currency.format(sub);

  els.checkoutBtn.disabled = cart.length === 0;
}

function toast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add('toast--show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => els.toast.classList.remove('toast--show'), 1400);
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// Events
els.searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  applyFilters();
});

els.categorySelect.addEventListener('change', applyFilters);
els.sortSelect.addEventListener('change', applyFilters);
els.applyFilters.addEventListener('click', applyFilters);
els.resetFilters.addEventListener('click', resetFilters);

els.cartBtn.addEventListener('click', openCart);

els.checkoutBtn.addEventListener('click', () => {
  // close cart and open checkout
  els.cartDialog.close();
  els.checkoutDialog.showModal();
});

els.checkoutForm.addEventListener('submit', (e) => {
  const action = (e.submitter && e.submitter.value) || '';
  if (action !== 'confirm') return; // cancel

  const cart = loadCart();
  if (!cart.length) return;

  const orderId = 'MS' + Date.now().toString().slice(-8);
  saveCart([]);
  syncCartBadge();
  toast(`Đặt hàng thành công (demo) · Mã đơn: ${orderId}`);
});

// Init
setupCategories();
resetFilters();
syncCartBadge();
