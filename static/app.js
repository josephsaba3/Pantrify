const $ = (selector) => document.querySelector(selector);
const categories = ['Staples', 'Fruit & Vege', 'Snacks', 'Household', 'Drinks'];
let current = { items: [], recent: [] };

$('#category').innerHTML = categories.map(c => `<option>${c}</option>`).join('');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}
function dateText(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, { day:'numeric', month:'long' }).format(new Date(value));
}
function toast(message) {
  const el = $('#toast'); el.textContent = message; el.classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 2200);
}
async function api(path, options = {}) {
  const response = await fetch(path, { headers:{'Content-Type':'application/json'}, ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}
function render() {
  const active = current.items.filter(item => !item.purchased_at);
  const purchased = current.items.filter(item => item.purchased_at);
  $('#count').textContent = active.length;
  const groups = categories.map(category => {
    const items = active.filter(item => item.category === category);
    if (!items.length && category !== 'Staples') return '';
    if (!items.length) return '<div class="category staples-empty"><div class="category-title">Staples</div><p>Your everyday essentials start here.</p></div>';
    return `<div class="category"><div class="category-title">${escapeHtml(category)}</div>${items.map((item, index) => `
      <article class="item" style="animation-delay:${Math.min(index * 45, 180)}ms">
        <button class="check" data-purchase="${item.id}" aria-label="Mark ${escapeHtml(item.name)} purchased">✓</button>
        <div class="item-copy"><div class="item-name">${escapeHtml(item.name)}</div>
          ${item.last_purchased ? `<div class="item-meta">Last bought ${dateText(item.last_purchased)}</div>` : '<div class="item-meta">New to your list</div>'}
        </div>${item.quantity ? `<span class="qty">${escapeHtml(item.quantity)}</span>` : ''}
      </article>`).join('')}</div>`;
  }).join('');
  const checked = purchased.length ? `<div class="checked-section"><div class="checked-heading"><span>Checked off</span><button data-clear-purchased>Clear checked</button></div>${purchased.map(item => `
    <article class="item purchased"><button class="check" disabled aria-label="Purchased">✓</button><div class="item-copy"><div class="item-name">${escapeHtml(item.name)}</div><div class="item-meta">Bought ${dateText(item.purchased_at)}</div></div>${item.quantity ? `<span class="qty">${escapeHtml(item.quantity)}</span>` : ''}</article>`).join('')}</div>` : '';
  $('#list-view').innerHTML = groups + checked || '<div class="empty"><div class="empty-icon">✓</div><strong>Your list is clear</strong><p>Add something above when you think of it.</p></div>';
  $('#history-view').innerHTML = current.recent.length ? `<div class="category">${current.recent.map(item => `<div class="history-item"><div class="item-copy"><div class="item-name">${escapeHtml(item.name)}</div><div class="item-meta">${escapeHtml(item.category)} · Bought ${dateText(item.purchased_at)}${item.purchase_count > 1 ? ` · ${item.purchase_count} times` : ''}</div></div><button data-repeat="${escapeHtml(item.name)}">＋ Add</button></div>`).join('')}</div>` : '<div class="empty"><div class="empty-icon">☷</div><strong>No purchases yet</strong><p>Checked items will be remembered here.</p></div>';
}
async function refresh() {
  const next = await api('/api/state');
  if (JSON.stringify(next) !== JSON.stringify(current)) {
    current = next;
    render();
  }
}

$('#add-form').addEventListener('submit', async event => {
  event.preventDefault(); $('#error').textContent = '';
  const form = event.currentTarget;
  const body = Object.fromEntries(new FormData(form));
  try { current = await api('/api/items', { method:'POST', body:JSON.stringify(body) }); render(); form.reset(); $('#name').focus(); }
  catch (error) { $('#error').textContent = error.message; }
});
document.addEventListener('click', async event => {
  const purchase = event.target.closest('[data-purchase]');
  const repeat = event.target.closest('[data-repeat]');
  const clearPurchased = event.target.closest('[data-clear-purchased]');
  const newList = event.target.closest('[data-new-list]');
  try {
    if (purchase) { const card = purchase.closest('.item'); card.classList.add('purchasing'); await new Promise(resolve => setTimeout(resolve, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 380)); current = await api(`/api/items/${purchase.dataset.purchase}/purchase`, { method:'POST', body:'{}' }); render(); toast('Added to purchase history ✓'); }
    if (repeat) { current = await api('/api/repeat', { method:'POST', body:JSON.stringify({name:repeat.dataset.repeat}) }); render(); toast('Added to your list'); }
    if (clearPurchased) { current = await api('/api/items/clear-purchased', { method:'POST', body:'{}' }); render(); toast('Checked items cleared'); }
    if (newList && confirm('Start a new list? This clears every item on the current list.')) { current = await api('/api/items/new-list', { method:'POST', body:'{}' }); render(); toast('New list ready'); }
  } catch (error) { toast(error.message); }
});
$('.tabs').addEventListener('click', event => {
  const tab = event.target.closest('[data-tab]'); if (!tab) return;
  document.querySelectorAll('.tab').forEach(el => el.classList.toggle('active', el === tab));
  $('#list-view').hidden = tab.dataset.tab !== 'list'; $('#history-view').hidden = tab.dataset.tab !== 'history';
});
refresh().catch(error => { $('#list-view').innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`; });
setInterval(refresh, 5000);
