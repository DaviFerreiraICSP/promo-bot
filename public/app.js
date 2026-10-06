// Estado Global da Aplicação
let authToken = localStorage.getItem('promobot_token') || null;
let currentUser = JSON.parse(localStorage.getItem('promobot_user') || 'null');
let channels = [];
let allRules = [];
let activeTenant = null;

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
  setInterval(updateClock, 1000);
  updateClock();
  checkAuth();
});

// ----------------------------------------------------
// 1. GERENCIAMENTO DE AUTENTICAÇÃO E SESSÃO
// ----------------------------------------------------
function checkAuth() {
  const loginContainer = document.getElementById('login-container');
  const dashboardContainer = document.getElementById('dashboard-container');
  const userDisplayName = document.getElementById('user-display-name');

  if (authToken && currentUser) {
    if (loginContainer) loginContainer.classList.add('hidden');
    if (dashboardContainer) dashboardContainer.classList.remove('hidden');
    if (userDisplayName) userDisplayName.innerText = currentUser.username || 'admin';
    initDashboard();
  } else {
    if (loginContainer) loginContainer.classList.remove('hidden');
    if (dashboardContainer) dashboardContainer.classList.add('hidden');
  }
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const usernameInput = document.getElementById('login-username').value.trim();
  const passwordInput = document.getElementById('login-password').value.trim();
  const errorBox = document.getElementById('login-error');
  const loginBtn = document.getElementById('login-btn');

  errorBox.classList.add('hidden');
  loginBtn.innerText = 'Autenticando…';
  loginBtn.disabled = true;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: usernameInput, password: passwordInput }),
    });

    const data = await res.json();
    loginBtn.innerHTML = '<span>Acessar Painel de Controle</span>';
    loginBtn.disabled = false;

    if (data.success && data.token) {
      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem('promobot_token', authToken);
      localStorage.setItem('promobot_user', JSON.stringify(currentUser));
      checkAuth();
    } else {
      errorBox.innerText = data.error || 'Credenciais inválidas.';
      errorBox.classList.remove('hidden');
    }
  } catch (err) {
    loginBtn.innerHTML = '<span>Acessar Painel de Controle</span>';
    loginBtn.disabled = false;
    errorBox.innerText = 'Erro ao conectar ao servidor: ' + err.message;
    errorBox.classList.remove('hidden');
  }
}

function handleLogout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('promobot_token');
  localStorage.removeItem('promobot_user');
  checkAuth();
}

function togglePasswordVisibility() {
  const passInput = document.getElementById('login-password');
  if (passInput) {
    passInput.type = passInput.type === 'password' ? 'text' : 'password';
  }
}

// Wrapper fetch autenticado
async function authFetch(url, options = {}) {
  const headers = options.headers || {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    handleLogout();
    throw new Error('Sessão expirada. Faça login novamente.');
  }
  return res;
}

// ----------------------------------------------------
// 2. INICIALIZAÇÃO DO DASHBOARD
// ----------------------------------------------------
async function initDashboard() {
  await Promise.all([loadStats(), loadTenantData(), loadChannels()]);
}

// Navegação entre abas
function switchTab(tabId) {
  document.querySelectorAll('.tab-view').forEach((el) => el.classList.add('hidden'));
  document.querySelectorAll('.nav-tab').forEach((el) => {
    el.classList.remove('border-black', 'bg-white', 'shadow-sm');
    el.classList.add('border-transparent');
  });

  const activeView = document.getElementById(`view-${tabId}`);
  const activeTabBtn = document.getElementById(`tab-${tabId}`);
  if (activeView) activeView.classList.remove('hidden');
  if (activeTabBtn) {
    activeTabBtn.classList.add('border-black', 'bg-white', 'shadow-sm');
    activeTabBtn.classList.remove('border-transparent');
  }

  if (tabId === 'rules') renderRulesGrid();
  if (tabId === 'channels') renderChannelsTable();
  if (tabId === 'simulator') populateSimulatorSelect();
  if (tabId === 'publish') populatePublishChannels();
}

// Estatísticas KPIs
async function loadStats() {
  try {
    const res = await authFetch('/api/stats');
    const data = await res.json();
    document.getElementById('stat-deals-count').innerText = data.dealsCount || 0;
    document.getElementById('stat-channels-count').innerText = data.channelsCount || 0;
    document.getElementById('stat-rules-count').innerText = data.rulesCount || 0;
    document.getElementById('stat-posts-count').innerText = data.postsCount || 0;
  } catch (err) {
    console.warn('Erro ao carregar stats:', err);
  }
}

// Dados do Tenant
async function loadTenantData() {
  try {
    const res = await authFetch('/api/tenants');
    const tenants = await res.json();
    if (tenants && tenants.length > 0) {
      activeTenant = tenants[0];
      document.getElementById('tag-amazon').value = activeTenant.amazonTag || '';
      document.getElementById('tag-shopee').value = activeTenant.shopeeTag || '';
      document.getElementById('tag-meli').value = activeTenant.mercadolivreTag || '';
      document.getElementById('tag-magalu').value = activeTenant.magaluTag || '';
      document.getElementById('tag-footer').value = activeTenant.customFooter || '';
    }
  } catch (err) {
    console.warn('Erro ao carregar tenant:', err);
  }
}

// Canais & Regras
async function loadChannels() {
  try {
    const res = await authFetch('/api/channels');
    channels = await res.json();
    allRules = [];
    channels.forEach((ch) => {
      if (ch.filterRules) {
        ch.filterRules.forEach((r) => {
          allRules.push({ ...r, channelName: ch.name });
        });
      }
    });
    renderRulesGrid();
    renderChannelsTable();
    loadStats();
  } catch (err) {
    console.warn('Erro ao carregar canais:', err);
  }
}

// ----------------------------------------------------
// 3. TAB: REGRAS DE NICHO
// ----------------------------------------------------
function renderRulesGrid() {
  const container = document.getElementById('rules-grid');
  if (!container) return;

  if (allRules.length === 0) {
    container.innerHTML = `
      <div class="col-span-full p-8 text-center retro-window space-y-3">
        <span class="text-3xl">📚</span>
        <h3 class="text-sm font-bold">Nenhuma regra de nicho ativa</h3>
        <p class="text-xs text-stone-600 max-w-md mx-auto">Crie sua primeira regra personalizada com autores, editoras e conceitos específicos.</p>
        <button onclick="applyPresetTheology()" class="retro-btn retro-btn-teal px-4 py-2 text-white">
          ✨ Aplicar Preset: Teologia Reformada
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = allRules
    .map(
      (rule) => `
    <div class="retro-window flex flex-col justify-between overflow-hidden">
      <div class="pinstripe-titlebar">
        <div class="titlebar-box" onclick="deleteRule('${rule.id}')" aria-label="Excluir regra ${rule.name}" title="Excluir"></div>
        <div class="titlebar-text">${rule.category} • ${rule.name}</div>
        <div class="titlebar-box" onclick="testRuleInSimulator('${rule.id}')" aria-label="Testar regra ${rule.name}" title="Testar"></div>
      </div>

      <div class="p-3.5 space-y-2.5 text-xs bg-[#EFE8DC]">
        <div class="flex items-center justify-between">
          <span class="font-bold text-[11px] text-stone-800">Canal: <b>${rule.channelName || 'Principal'}</b></span>
          <span class="bg-white border border-black px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
            ⏱️ ${rule.checkIntervalMinutes || 15}m
          </span>
        </div>

        ${
          rule.brandOrAuthor
            ? `
          <div class="bg-purple-100 p-2 border border-purple-800 text-[10px] text-purple-900 font-mono truncate">
            <b>✍️ Autores/Editoras:</b> ${rule.brandOrAuthor}
          </div>
        `
            : ''
        }

        ${
          rule.keywordsInclude
            ? `
          <div class="bg-emerald-100 p-2 border border-emerald-800 text-[10px] text-emerald-900 font-mono truncate">
            <b>✅ Conceitos:</b> ${rule.keywordsInclude}
          </div>
        `
            : ''
        }

        ${
          rule.keywordsExclude
            ? `
          <div class="bg-rose-100 p-2 border border-rose-800 text-[10px] text-rose-900 font-mono truncate">
            <b>🚫 Proibidos:</b> ${rule.keywordsExclude}
          </div>
        `
            : ''
        }

        <div class="grid grid-cols-2 gap-2 text-[10px]">
          <div class="bg-white p-1.5 border border-black flex justify-between">
            <span>Teto Preço:</span>
            <b class="tabular-nums">${rule.maxPrice ? 'R$ ' + rule.maxPrice : 'Livre'}</b>
          </div>
          <div class="bg-white p-1.5 border border-black flex justify-between">
            <span>Desc. Mín:</span>
            <b class="text-amber-800 tabular-nums">${rule.minDiscountPercent ? rule.minDiscountPercent + '% OFF' : 'Livre'}</b>
          </div>
        </div>
      </div>

      <div class="p-2 border-t-2 border-black bg-[#E8DFC9] flex items-center justify-between">
        <button onclick="testRuleInSimulator('${rule.id}')" aria-label="Testar regra ${rule.name} no simulador" class="retro-btn px-2.5 py-1 text-teal-900">
          🧪 Testar no CRT
        </button>
        <button onclick="deleteRule('${rule.id}')" aria-label="Excluir regra ${rule.name}" class="retro-btn px-2.5 py-1 text-rose-800">
          Excluir
        </button>
      </div>
    </div>
  `
    )
    .join('');
}

// ----------------------------------------------------
// 4. TAB: CANAIS & FREQUÊNCIA
// ----------------------------------------------------
function renderChannelsTable() {
  const tbody = document.getElementById('channels-table-body');
  if (!tbody) return;

  if (channels.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="p-6 text-center text-stone-500 text-xs">
          Nenhum canal cadastrado ainda. Clique em "+ Cadastrar Canal".
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = channels
    .map(
      (ch) => `
    <tr class="hover:bg-black/5">
      <td class="p-3">
        <div class="font-bold text-xs">${ch.name}</div>
        <div class="font-mono text-[11px] text-stone-600">${ch.chatId}</div>
      </td>
      <td class="p-3">
        <span class="px-2 py-0.5 border border-black text-[10px] font-bold ${
          ch.platform === 'WHATSAPP'
            ? 'bg-emerald-200 text-emerald-950'
            : 'bg-sky-200 text-sky-950'
        }">
          ${ch.platform}
        </span>
      </td>
      <td class="p-3">
        <select onchange="updateChannelInterval('${ch.id}', this.value)" class="retro-input p-1 text-[11px] font-bold">
          <option value="5" ${ch.checkIntervalMinutes === 5 ? 'selected' : ''}>5 minutos</option>
          <option value="15" ${ch.checkIntervalMinutes === 15 ? 'selected' : ''}>15 minutos</option>
          <option value="30" ${ch.checkIntervalMinutes === 30 ? 'selected' : ''}>30 minutos</option>
          <option value="60" ${ch.checkIntervalMinutes === 60 ? 'selected' : ''}>1 hora</option>
          <option value="120" ${ch.checkIntervalMinutes === 120 ? 'selected' : ''}>2 horas</option>
          <option value="360" ${ch.checkIntervalMinutes === 360 ? 'selected' : ''}>6 horas</option>
        </select>
      </td>
      <td class="p-3">
        <span class="font-bold text-teal-800">
          ${ch.filterRules ? ch.filterRules.length : 0} nicho(s)
        </span>
      </td>
      <td class="p-3 font-bold text-xs ${ch.isActive ? 'text-emerald-700' : 'text-rose-700'}">
        ${ch.isActive ? '● ATIVO' : '○ PAUSADO'}
      </td>
      <td class="p-3 text-right">
        <button onclick="deleteChannel('${ch.id}')" aria-label="Remover canal ${ch.name}" class="retro-btn px-2 py-0.5 text-rose-800 text-[11px]">
          Remover
        </button>
      </td>
    </tr>
  `
    )
    .join('');
}

// ----------------------------------------------------
// 5. TAB: SIMULADOR & TELEGRAM MOCKUP
// ----------------------------------------------------
function populateSimulatorSelect() {
  const select = document.getElementById('sim-rule-select');
  if (!select) return;

  if (allRules.length === 0) {
    select.innerHTML = `<option value="">Nenhuma regra criada. Crie uma regra primeiro.</option>`;
    return;
  }

  select.innerHTML = allRules
    .map((r) => `<option value="${r.id}">${r.name} (${r.category})</option>`)
    .join('');
}

async function runFilterSimulation() {
  const ruleId = document.getElementById('sim-rule-select').value;
  const url = document.getElementById('sim-url').value.trim();
  const diagContainer = document.getElementById('sim-diagnostics');
  const btnText = document.getElementById('sim-btn-text');

  if (!url) {
    alert('Por favor, cole a URL de um produto.');
    return;
  }

  const selectedRule = allRules.find((r) => r.id === ruleId);
  if (!selectedRule) {
    alert('Selecione uma regra válida.');
    return;
  }

  btnText.innerText = 'Extraindo e avaliando dados…';
  diagContainer.classList.remove('hidden');
  diagContainer.innerHTML = `
    <div class="p-3 text-center text-xs text-stone-600 flex items-center justify-center gap-2">
      <span class="font-vt text-lg text-teal-800">⏳</span> Raspando metadados e aplicando motor de filtros…
    </div>
  `;

  try {
    const res = await authFetch('/api/deals/test-filter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, rule: selectedRule }),
    });

    const data = await res.json();
    btnText.innerText = 'Testar Critérios de Filtro';

    if (data.error) {
      diagContainer.innerHTML = `<div class="p-2.5 bg-rose-200 border-2 border-rose-800 text-rose-950 text-xs font-bold">${data.error}</div>`;
      return;
    }

    const { scraped, evaluation } = data;
    const isApproved = evaluation.matches;

    // 1. Atualiza Diagnóstico de Critérios
    diagContainer.innerHTML = `
      <div class="p-3 border-2 ${
        isApproved
          ? 'bg-emerald-100 border-emerald-800 text-emerald-950'
          : 'bg-rose-100 border-rose-800 text-rose-950'
      } space-y-2">
        <div class="flex items-center justify-between">
          <span class="px-2 py-0.5 border border-black text-[10px] font-bold ${
            isApproved ? 'bg-emerald-400 text-black' : 'bg-rose-400 text-white'
          }">
            ${isApproved ? '✅ APROVADO PARA BROADCAST' : '❌ REPROVADO PELO FILTRO'}
          </span>
          <span class="text-[11px]">Plataforma: <b>${scraped.platform}</b></span>
        </div>

        <div class="space-y-1 text-xs">
          <span class="text-[10px] font-bold text-stone-700 uppercase">Diagnóstico dos critérios:</span>
          <ul class="space-y-0.5">
            ${evaluation.reasons
              .map(
                (r) =>
                  `<li class="flex items-center gap-1.5 font-mono text-[11px]"><span class="${
                    isApproved ? 'text-emerald-700' : 'text-rose-700'
                  }">•</span> ${r}</li>`
              )
              .join('')}
          </ul>
        </div>
      </div>
    `;

    // 2. Atualiza Mockup da Mensagem no Telegram em Tempo Real
    document.getElementById('tg-title').innerText = scraped.title || 'Título do produto';
    if (scraped.price) {
      document.getElementById('tg-prices').innerHTML = `
        ${scraped.originalPrice ? `<div class="text-slate-400 line-through text-[11px]">De: R$ ${scraped.originalPrice.toFixed(2)}</div>` : ''}
        <div class="text-white font-extrabold text-sm">🔥 Por: R$ ${scraped.price.toFixed(2)}</div>
      `;
    }

    if (scraped.imageUrl) {
      const img = document.getElementById('tg-img');
      img.src = scraped.imageUrl;
      img.classList.remove('hidden');
      document.getElementById('tg-no-img').classList.add('hidden');
    }

    const ctaBtn = document.getElementById('tg-cta-btn');
    ctaBtn.innerText = `🛍️ Comprar na ${scraped.platform || 'Loja'}`;
    ctaBtn.href = url;
  } catch (err) {
    btnText.innerText = 'Testar Critérios de Filtro';
    diagContainer.innerHTML = `<div class="p-3 rounded-xl bg-rose-500/10 text-rose-400 text-xs">Erro: ${err.message}</div>`;
  }
}

// ----------------------------------------------------
// 6. PRESETS & MODAIS
// ----------------------------------------------------
async function applyPresetTheology() {
  if (channels.length === 0) {
    // Cadastra um canal inicial se não houver
    const res = await authFetch('/api/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: '@canal_teologia_promos',
        name: 'Canal Livros de Teologia',
        platform: 'TELEGRAM',
        checkIntervalMinutes: 15,
      }),
    });
    const data = await res.json();
    if (data.channel) channels.push(data.channel);
  }

  const chan = channels[0];
  if (!chan) return;

  await authFetch(`/api/channels/${chan.id}/rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Livros de Teologia Reformada',
      category: 'LIVROS',
      checkIntervalMinutes: 15,
      brandOrAuthor: 'Vida Nova, Thomas Nelson, Editora Fiel, John Piper, C.S. Lewis, Spurgeon, Calvino',
      keywordsInclude: 'teologia, doutrina, graça, expiação, soberania, fé',
      keywordsExclude: 'autoajuda, romance, ficção, esoterismo',
      minPrice: 10,
      maxPrice: 150,
      minDiscountPercent: 20,
    }),
  });

  await loadChannels();
  alert('✨ Preset "Livros de Teologia Reformada" aplicado com sucesso com todos os autores e filtros!');
}

function openRuleModal() {
  if (channels.length === 0) {
    alert('Cadastre um canal primeiro para vincular a regra de nicho.');
    switchTab('channels');
    return;
  }

  const select = document.getElementById('modal-channel-select');
  select.innerHTML = channels.map((ch) => `<option value="${ch.id}">${ch.name}</option>`).join('');

  document.getElementById('rule-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('modal-name')?.focus(), 50);
}

function closeRuleModal() {
  document.getElementById('rule-modal').classList.add('hidden');
}

async function saveRuleFromModal() {
  const channelId = document.getElementById('modal-channel-select').value;
  const payload = {
    name: document.getElementById('modal-name').value.trim() || 'Regra de Nicho',
    category: document.getElementById('modal-category').value,
    checkIntervalMinutes: parseInt(document.getElementById('modal-interval').value) || 15,
    brandOrAuthor: document.getElementById('modal-brands').value.trim() || null,
    keywordsInclude: document.getElementById('modal-includes').value.trim() || null,
    keywordsExclude: document.getElementById('modal-excludes').value.trim() || null,
    minPrice: parseFloat(document.getElementById('modal-min-price').value) || null,
    maxPrice: parseFloat(document.getElementById('modal-max-price').value) || null,
    minDiscountPercent: parseInt(document.getElementById('modal-discount').value) || null,
  };

  try {
    const res = await authFetch(`/api/channels/${channelId}/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      closeRuleModal();
      await loadChannels();
    }
  } catch (err) {
    alert('Erro ao salvar regra: ' + err.message);
  }
}

function openChannelModal() {
  document.getElementById('channel-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('chan-chatid')?.focus(), 50);
}

function closeChannelModal() {
  document.getElementById('channel-modal').classList.add('hidden');
}

async function saveChannelFromModal() {
  const payload = {
    platform: document.getElementById('chan-platform').value,
    chatId: document.getElementById('chan-chatid').value.trim(),
    name: document.getElementById('chan-name').value.trim(),
    checkIntervalMinutes: parseInt(document.getElementById('chan-interval').value) || 15,
  };

  if (!payload.chatId) {
    alert('Informe o ID ou @username do canal.');
    return;
  }

  try {
    const res = await authFetch('/api/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      closeChannelModal();
      await loadChannels();
    }
  } catch (err) {
    alert('Erro ao cadastrar canal: ' + err.message);
  }
}

async function updateChannelInterval(channelId, minutes) {
  try {
    await authFetch(`/api/channels/${channelId}/interval`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minutes }),
    });
  } catch (err) {
    console.error(err);
  }
}

async function deleteChannel(channelId) {
  if (!confirm('Deseja realmente remover este canal e suas regras?')) return;
  try {
    await authFetch(`/api/channels/${channelId}`, { method: 'DELETE' });
    await loadChannels();
  } catch (err) {
    alert('Erro: ' + err.message);
  }
}

async function deleteRule(ruleId) {
  if (!confirm('Deseja excluir esta regra de nicho?')) return;
  try {
    await authFetch(`/api/rules/${ruleId}`, { method: 'DELETE' });
    await loadChannels();
  } catch (err) {
    alert('Erro: ' + err.message);
  }
}

function testRuleInSimulator(ruleId) {
  switchTab('simulator');
  const select = document.getElementById('sim-rule-select');
  if (select) select.value = ruleId;
}

// ----------------------------------------------------
// 7. TAGS DE AFILIADOS & POST MANUAL
// ----------------------------------------------------
async function saveAffiliateTags() {
  if (!activeTenant) return;

  const payload = {
    amazonTag: document.getElementById('tag-amazon').value.trim(),
    shopeeTag: document.getElementById('tag-shopee').value.trim(),
    mercadolivreTag: document.getElementById('tag-meli').value.trim(),
    magaluTag: document.getElementById('tag-magalu').value.trim(),
    customFooter: document.getElementById('tag-footer').value.trim(),
  };

  try {
    const res = await authFetch(`/api/tenants/${activeTenant.id}/tags`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      alert('✅ Tags de afiliados salvas com sucesso!');
    }
  } catch (err) {
    alert('Erro ao salvar tags: ' + err.message);
  }
}

function populatePublishChannels() {
  const container = document.getElementById('pub-channels-list');
  if (!container) return;

  if (channels.length === 0) {
    container.innerHTML = `<p class="text-stone-500">Nenhum canal cadastrado.</p>`;
    return;
  }

  container.innerHTML = channels
    .map(
      (ch) => `
    <label class="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-black/5">
      <input type="checkbox" value="${ch.id}" class="pub-chan-checkbox" checked>
      <span class="font-bold">[${ch.platform}] ${ch.name}</span>
    </label>
  `
    )
    .join('');
}

async function executeManualPublish() {
  const url = document.getElementById('pub-url').value.trim();
  const price = parseFloat(document.getElementById('pub-price').value) || undefined;
  const coupon = document.getElementById('pub-coupon').value.trim() || undefined;

  const selectedChannels = Array.from(
    document.querySelectorAll('.pub-chan-checkbox:checked')
  ).map((cb) => cb.value);

  if (!url) {
    alert('Por favor, insira o link do produto.');
    return;
  }
  if (selectedChannels.length === 0) {
    alert('Selecione pelo menos um canal.');
    return;
  }

  const btnText = document.getElementById('pub-btn-text');
  btnText.innerText = 'Processando e enviando aos canais…';

  try {
    const res = await authFetch('/api/deals/manual-publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        price,
        coupon,
        channelIds: selectedChannels,
      }),
    });

    const data = await res.json();
    btnText.innerText = 'Disparar Oferta com Links Afiliados';

    if (data.success) {
      alert(`🎉 Oferta enviada com sucesso para ${data.publishedCount} canal(is)!`);
      document.getElementById('pub-url').value = '';
    } else {
      alert('Erro: ' + (data.error || 'Falha ao publicar'));
    }
  } catch (err) {
    btnText.innerText = 'Disparar Oferta com Links Afiliados';
    alert('Erro ao publicar: ' + err.message);
  }
}

// ----------------------------------------------------
// 8. ACESSIBILIDADE GLOBAL (Web Interface Guidelines)
// ----------------------------------------------------
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeRuleModal();
    closeChannelModal();
  }
});

// ----------------------------------------------------
// 9. FUNÇÕES RETRÔ POOLSUITE (Relógio & Temas)
// ----------------------------------------------------
function updateClock() {
  const clockEl = document.getElementById('retro-clock');
  if (clockEl) {
    const now = new Date();
    clockEl.innerText = now.toLocaleTimeString('en-US', { hour12: true });
  }
}

let isDarkMode = false;
function toggleTheme() {
  isDarkMode = !isDarkMode;
  const root = document.documentElement;
  if (isDarkMode) {
    root.style.setProperty('--ps-bg', '#101416');
    root.style.setProperty('--ps-window-bg', '#1a2226');
    root.style.setProperty('--ps-window-border', '#00ffcc');
    root.style.setProperty('--ps-ink', '#e0f7f4');
    root.style.setProperty('--ps-bevel-light', '#32424a');
    root.style.setProperty('--ps-bevel-dark', '#080c0e');
  } else {
    root.style.setProperty('--ps-bg', '#F4ECE1');
    root.style.setProperty('--ps-window-bg', '#EFE8DC');
    root.style.setProperty('--ps-window-border', '#1A1614');
    root.style.setProperty('--ps-ink', '#1A1614');
    root.style.setProperty('--ps-bevel-light', '#FFFFFF');
    root.style.setProperty('--ps-bevel-dark', '#8C8479');
  }
}
