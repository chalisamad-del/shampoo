/* =========================================================
   Body Scent — shared script (product / order / admin)
   Each section runs only if its elements exist on the page.
   ========================================================= */

var ORDER_URL = 'https://script.google.com/macros/s/AKfycbyIAED-23fTI5WEqJ7pSDczVDBUHzIpqOt1g7RkOVlZLQVWdiGOX_rmFLp3cmfMSw8ZJg/exec';
var ORDERS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTUUAtoV5a2YAJTs78mB3MNEfDQT30W92Fy-5i_-P1dQs1Uxqw29J5bKg8O7UXJgGtWP8zbSPic_f0n/pub?gid=0&single=true&output=csv';

var MOODS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'fresh', label: 'Fresh' },
  { key: 'sweet', label: 'Sweet' },
  { key: 'confident', label: 'Confident' },
  { key: 'romance', label: 'Romance' }
];

document.addEventListener('DOMContentLoaded', function () {
  if (document.getElementById('product-list')) initProductPage();
  if (document.getElementById('orderForm')) initOrderPage();
  if (document.getElementById('ordersTable')) initAdminPage();
});

/* ---------------------------------------------------------
   1) product.html — cards + mood filter
   --------------------------------------------------------- */
function initProductPage() {
  var listEl = document.getElementById('product-list');
  var filterEl = document.getElementById('filter-bar');
  var products = [];

  var params = new URLSearchParams(window.location.search);
  var current = (params.get('mood') || 'all').toLowerCase();
  var valid = MOODS.some(function (m) { return m.key === current; });
  if (!valid) current = 'all';

  function renderFilters() {
    if (!filterEl) return;
    filterEl.innerHTML = '';
    MOODS.forEach(function (m) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = m.label;
      btn.setAttribute('data-mood-filter', m.key);
      if (m.key === current) btn.classList.add('active');
      btn.addEventListener('click', function () {
        current = m.key;
        renderFilters();
        renderProducts();
      });
      filterEl.appendChild(btn);
    });
  }

  function renderProducts() {
    var items = products.filter(function (p) {
      return current === 'all' || p.mood === current;
    });

    listEl.innerHTML = '';

    if (items.length === 0) {
      listEl.innerHTML = '<p class="text-center">ไม่พบสินค้าในหมวดนี้</p>';
      return;
    }

    items.forEach(function (p) {
      var fullName = p.name + ' ' + p.size;
      var orderLink = 'order.html?item=' + encodeURIComponent(fullName) +
                      '&price=' + encodeURIComponent(p.price);

      var card = document.createElement('div');
      card.className = 'product-card';
      card.setAttribute('data-mood', p.mood);
      card.innerHTML =
        '<img src="' + esc(p.image) + '" alt="' + esc(p.name) + '" loading="lazy">' +
        '<h3><span class="mood-dot"></span>' + esc(p.name) + '</h3>' +
        '<div class="size">' + esc(p.size) + '</div>' +
        '<div class="price">' + Number(p.price).toLocaleString('th-TH') + ' บาท</div>' +
        '<a class="btn btn-sm" href="' + orderLink + '">สั่งซื้อ</a>';
      listEl.appendChild(card);
    });
  }

  renderFilters();

  fetch('products.json')
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      products = data;
      renderProducts();
    })
    .catch(function (err) {
      console.error(err);
      listEl.innerHTML = '<p class="text-center">โหลดข้อมูลสินค้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>';
    });
}

/* ---------------------------------------------------------
   2) order.html — prefill from URL + submit to Apps Script
   --------------------------------------------------------- */
function initOrderPage() {
  var params = new URLSearchParams(window.location.search);
  var item = params.get('item');
  var price = params.get('price');

  var itemsEl = document.getElementById('items');
  var totalEl = document.getElementById('total');

  if (item && itemsEl) itemsEl.value = item;
  if (price && totalEl) totalEl.value = price;

  document.getElementById('orderForm').addEventListener('submit', function (e) {
    e.preventDefault();

    var payload = {
      customerName: document.getElementById('customerName').value,
      contact: document.getElementById('contact').value,
      items: document.getElementById('items').value,
      total: document.getElementById('total').value,
      note: document.getElementById('note').value
    };

    fetch(ORDER_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    .then(() => { window.location.href = 'thankyou.html'; })
    .catch(error => {
      console.error(error);
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    });
  });
}

/* ---------------------------------------------------------
   3) admin.html — orders table from published Sheet CSV
   --------------------------------------------------------- */
function initAdminPage() {
  var tbody = document.querySelector('#ordersTable tbody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6">กำลังโหลดข้อมูล...</td></tr>';

  fetch(ORDERS_CSV_URL)
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    })
    .then(function (text) {
      var rows = parseCSV(text);
      rows.shift(); // header row

      rows = rows.filter(function (r) {
        return r.some(function (c) { return c.trim() !== ''; });
      });

      rows.reverse(); // newest first (orders are appended at the bottom)

      tbody.innerHTML = '';

      if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">ยังไม่มีรายการสั่งซื้อ</td></tr>';
        return;
      }

      rows.forEach(function (r) {
        var tr = document.createElement('tr');
        for (var i = 0; i < 6; i++) {
          var td = document.createElement('td');
          td.textContent = r[i] !== undefined ? r[i] : '';
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      });
    })
    .catch(function (err) {
      console.error(err);
      tbody.innerHTML = '<tr><td colspan="6">โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</td></tr>';
    });
}

/* Minimal CSV parser: quoted fields, "" escapes, commas and newlines inside quotes */
function parseCSV(text) {
  var rows = [];
  var row = [];
  var field = '';
  var inQuotes = false;

  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1); // strip BOM

  for (var i = 0; i < text.length; i++) {
    var ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

/* Escape text for safe insertion into innerHTML */
function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
