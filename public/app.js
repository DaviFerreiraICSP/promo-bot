// Estado Global da Aplicação
let channels = [];
let allRules = [];
let activeTenant = null;

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
  await loadTenantData();
  await loadChannels();
  setupSampleDataIfEmpty();
});

// Navegação entre abas
function switchTab(tabId) {
  document.querySelectorAll('.tab-view').forEach((el) => el.classList.add('hidden'));
  document.querySelectorAll('.nav-tab').forEach((el) => {
    el.classList.remove('bg-indigo-600', 'text-white', 'font-semibold', 'shadow-sm');
    el.classList.add('text-gray-400');
  });

  const activeView = document.getElementById(`view-${tabId}`);
  const activeTabBtn = document.getElementById(`tab-${tabId}`);
  if (activeView) activeView.classList.remove('hidden');
  if (activeTabBtn) {
    activeTabBtn.classList.add('bg-indigo-600', 'text-white', 'font-semibold', 'shadow-sm');
    activeTabBtn.classList.remove('text-gray-400');
  }

  if (tabId === 'rules') renderRulesGrid();
  if (tabId === 'channels') renderChannelsTable();
  if (tabId === 'simulator') populateSimulatorSelect();
  if (tabId === 'publish') populatePublishChannels();
}

// 1. Carrega dados do Tenant
async function loadTenantData() {
  try {
    const res = await fetch('/api/tenants');
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
    console.warn('Erro ao carregar dados do tenant:', err);
  }
}

// 2. Carrega Canais & Regras
async function loadChannels() {
  try {
    const res = await fetch('/api/channels');
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
  } catch (err) {
    console.warn('Erro ao carregar canais:', err);
  }
}

// Renderiza Grid de Regras de Nicho
function renderRulesGrid() {
  const container = document.getElementById('rules-grid');
  if (!container) return;

  if (allRules.length === 0) {
    container.innerHTML = `
      <div class="col-span-full p-8 text-center bg-dark-800 rounded-2xl border border-dark-700 space-y-3">
        <span class="text-3xl">📚</span>
        <h3 class="text-sm font-bold text-white">Nenhuma regra de nicho criada ainda</h3>
        <p class="text-xs text-gray-400 max-w-sm mx-auto">Crie sua primeira regra para filtrar produtos específicos (como livros de teologia de determinadas editoras e autores).</p>
        <button onclick="createDefaultTheologyRule()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md">
          ✨ Adicionar Regra Exemplo: Livros de Teologia
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = allRules
    .map(
      (rule) => `
    <div class="bg-dark-800 border border-dark-700 rounded-2xl p-5 space-y-4 hover:border-indigo-500/50 transition-all shadow-lg flex flex-col justify-between">
      <div class="space-y-3">
        <div class="flex items-start justify-between">
          <div>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              ${rule.category}
            </span>
            <h3 class="font-bold text-white text-sm mt-1.5">${rule.name}</h3>
            <p class="text-[11px] text-gray-400">Canal: <span class="text-gray-200 font-medium">${rule.channelName || 'Padrão'}</span></p>
          </div>
          <span class="px-2 py-1 rounded-lg text-[10px] font-semibold bg-dark-900 border border-dark-700 text-amber-400">
            ⏱️ a cada ${rule.checkIntervalMinutes || 15}m
          </span>
        </div>

        <!-- Autores & Editoras -->
        ${
          rule.brandOrAuthor
            ? `
          <div class="space-y-1">
            <span class="text-[10px] font-semibold text-purple-400 uppercase tracking-wider">Autores / Editoras:</span>
            <p class="text-xs text-gray-300 bg-dark-900/60 p-2 rounded-lg border border-dark-700 font-mono text-[11px] truncate">
              ${rule.brandOrAuthor}
            </p>
          </div>
        `
            : ''
        }

        <!-- Termos Obrigatórios -->
        ${
          rule.keywordsInclude
            ? `
          <div class="space-y-1">
            <span class="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Conceitos Requeridos:</span>
            <p class="text-xs text-gray-300 bg-dark-900/60 p-2 rounded-lg border border-dark-700 font-mono text-[11px] truncate">
              ${rule.keywordsInclude}
            </p>
          </div>
        `
            : ''
        }

        <!-- Termos Proibidos -->
        ${
          rule.keywordsExclude
            ? `
          <div class="space-y-1">
            <span class="text-[10px] font-semibold text-rose-400 uppercase tracking-wider">Termos Excluídos:</span>
            <p class="text-xs text-rose-300/80 bg-rose-500/5 p-2 rounded-lg border border-rose-500/20 font-mono text-[11px] truncate">
              ${rule.keywordsExclude}
            </p>
          </div>
        `
            : ''
        }

        <!-- Faixa de Preço & Desconto -->
        <div class="grid grid-cols-2 gap-2 pt-1 text-[11px]">
          <div class="bg-dark-900 p-2 rounded-lg border border-dark-700 flex justify-between">
            <span class="text-gray-400">Preço Máx:</span>
            <span class="font-semibold text-white">${rule.maxPrice ? 'R$ ' + rule.maxPrice : 'Sem limite'}</span>
          </div>
          <div class="bg-dark-900 p-2 rounded-lg border border-dark-700 flex justify-between">
            <span class="text-gray-400">Desc. Mín:</span>
            <span class="font-semibold text-amber-400">${rule.minDiscountPercent ? rule.minDiscountPercent + '% OFF' : 'Qualquer'}</span>
          </div>
        </div>
      </div>

      <div class="pt-3 border-t border-dark-700 flex items-center justify-between">
        <button onclick="testRuleInSimulator('${rule.id}')" class="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1">
          🧪 Testar com Link
        </button>
        <button onclick="deleteRule('${rule.id}')" class="text-xs text-rose-400 hover:text-rose-300">
          Excluir
        </button>
      </div>
    </div>
  `
    )
    .join('');
}

// Renderiza Tabela de Canais
function renderChannelsTable() {
  const tbody = document.getElementById('channels-table-body');
  if (!tbody) return;

  if (channels.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="p-6 text-center text-gray-500 text-xs">
          Nenhum canal cadastrado ainda. Clique em "+ Cadastrar Canal".
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = channels
    .map(
      (ch) => `
    <tr class="hover:bg-dark-900/30 transition-all">
      <td class="p-4">
        <div class="font-bold text-white text-xs">${ch.name}</div>
        <div class="font-mono text-[11px] text-gray-400">${ch.chatId}</div>
      </td>
      <td class="p-4">
        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${
          ch.platform === 'WHATSAPP'
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
        }">
          ${ch.platform}
        </span>
      </td>
      <td class="p-4">
        <select onchange="updateChannelInterval('${ch.id}', this.value)" class="bg-dark-900 border border-dark-700 rounded-lg px-2.5 py-1 text-xs text-white">
          <option value="5" ${ch.checkIntervalMinutes === 5 ? 'selected' : ''}>5 minutos</option>
          <option value="15" ${ch.checkIntervalMinutes === 15 ? 'selected' : ''}>15 minutos</option>
          <option value="30" ${ch.checkIntervalMinutes === 30 ? 'selected' : ''}>30 minutos</option>
          <option value="60" ${ch.checkIntervalMinutes === 60 ? 'selected' : ''}>1 hora</option>
          <option value="120" ${ch.checkIntervalMinutes === 120 ? 'selected' : ''}>2 horas</option>
          <option value="360" ${ch.checkIntervalMinutes === 360 ? 'selected' : ''}>6 horas</option>
        </select>
      </td>
      <td class="p-4">
        <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300">
          ${ch.filterRules ? ch.filterRules.length : 0} regras
        </span>
      </td>
      <td class="p-4">
        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${
          ch.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
        }">
          ${ch.isActive ? 'Ativo' : 'Pausado'}
        </span>
      </td>
      <td class="p-4 text-right">
        <button onclick="deleteChannel('${ch.id}')" class="text-rose-400 hover:text-rose-300 text-xs font-semibold">
          Remover
        </button>
      </td>
    </tr>
  `
    )
    .join('');
}

// 3. Simulador de Filtros em Tempo Real
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
  const resultContainer = document.getElementById('sim-result');
  const btnText = document.getElementById('sim-btn-text');

  if (!url) {
    alert('Por favor, cole a URL de um produto para testar.');
    return;
  }

  const selectedRule = allRules.find((r) => r.id === ruleId);
  if (!selectedRule) {
    alert('Selecione uma regra válida.');
    return;
  }

  btnText.innerText = 'Analisando página...';
  resultContainer.classList.remove('hidden');
  resultContainer.innerHTML = `
    <div class="p-4 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
      <span class="animate-spin text-indigo-400 text-lg">⏳</span> Extraindo título, preço, editora e aplicando critérios...
    </div>
  `;

  try {
    const res = await fetch('/api/deals/test-filter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, rule: selectedRule }),
    });

    const data = await res.json();
    btnText.innerText = 'Testar Filtro';

    if (data.error) {
      resultContainer.innerHTML = `<div class="p-4 rounded-xl bg-rose-500/10 text-rose-400 text-xs">${data.error}</div>`;
      return;
    }

    const { scraped, evaluation } = data;
    const isApproved = evaluation.matches;

    resultContainer.innerHTML = `
      <div class="p-5 rounded-xl border ${
        isApproved
          ? 'bg-emerald-500/10 border-emerald-500/30'
          : 'bg-rose-500/10 border-rose-500/30'
      } space-y-3">
        <div class="flex items-center justify-between">
          <span class="px-2.5 py-1 rounded-full text-xs font-bold ${
            isApproved ? 'bg-emerald-500 text-black' : 'bg-rose-500 text-white'
          }">
            ${isApproved ? '✅ APROVADO PARA POSTAGEM' : '❌ REPROVADO PELO FILTRO'}
          </span>
          <span class="text-xs text-gray-400">Loja: <b class="text-white">${scraped.platform}</b></span>
        </div>

        <div class="flex gap-4 items-center bg-dark-900/60 p-3 rounded-xl border border-dark-700">
          ${scraped.imageUrl ? `<img src="${scraped.imageUrl}" class="w-16 h-16 object-cover rounded-lg border border-dark-700">` : ''}
          <div class="flex-1">
            <h4 class="font-bold text-xs text-white">${scraped.title}</h4>
            <div class="text-xs text-emerald-400 font-semibold mt-1">
              ${scraped.price ? 'Preço: R$ ' + scraped.price.toFixed(2) : 'Preço promocional no site'}
            </div>
          </div>
        </div>

        <div class="space-y-1">
          <span class="text-[10px] font-bold uppercase tracking-wider text-gray-400">Diagnóstico dos Critérios:</span>
          <ul class="text-xs space-y-1 text-gray-300">
            ${evaluation.reasons.map((r) => `<li class="flex items-center gap-1.5"><span class="${isApproved ? 'text-emerald-400' : 'text-amber-400'}">•</span> ${r}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
  } catch (err) {
    btnText.innerText = 'Testar Filtro';
    resultContainer.innerHTML = `<div class="p-4 rounded-xl bg-rose-500/10 text-rose-400 text-xs">Erro ao testar link: ${err.message}</div>`;
  }
}

// 4. Salvar Tags de Afiliados
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
    const res = await fetch(`/api/tenants/${activeTenant.id}/tags`, {
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

// 5. Postar Manual Rápido
function populatePublishChannels() {
  const container = document.getElementById('pub-channels-list');
  if (!container) return;

  if (channels.length === 0) {
    container.innerHTML = `<p class="text-gray-500">Nenhum canal cadastrado. Cadastre um canal primeiro.</p>`;
    return;
  }

  container.innerHTML = channels
    .map(
      (ch) => `
    <label class="flex items-center gap-2 cursor-pointer p-1 hover:bg-dark-800 rounded">
      <input type="checkbox" value="${ch.id}" class="pub-chan-checkbox rounded border-dark-700 text-indigo-600 focus:ring-0" checked>
      <span class="text-white font-medium">[${ch.platform}] ${ch.name}</span>
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
  btnText.innerText = 'Processando e Enviando...';

  try {
    const res = await fetch('/api/deals/manual-publish', {
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
    btnText.innerText = 'Publicar Agora com Meus Links';

    if (data.success) {
      alert(`🎉 Oferta postada com sucesso em ${data.publishedCount} canal(is)!`);
      document.getElementById('pub-url').value = '';
    } else {
      alert('Erro: ' + (data.error || 'Falha ao publicar'));
    }
  } catch (err) {
    btnText.innerText = 'Publicar Agora com Meus Links';
    alert('Erro ao publicar: ' + err.message);
  }
}

// Modais e Utilitários
function openRuleModal() {
  if (channels.length === 0) {
    alert('Cadastre um canal primeiro para vincular a regra de nicho.');
    switchTab('channels');
    return;
  }

  const select = document.getElementById('modal-channel-select');
  select.innerHTML = channels.map((ch) => `<option value="${ch.id}">${ch.name}</option>`).join('');

  document.getElementById('rule-modal').classList.remove('hidden');
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
    const res = await fetch(`/api/channels/${channelId}/rules`, {
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
    const res = await fetch('/api/channels', {
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
    await fetch(`/api/channels/${channelId}/interval`, {
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
    await fetch(`/api/channels/${channelId}`, { method: 'DELETE' });
    await loadChannels();
  } catch (err) {
    alert('Erro: ' + err.message);
  }
}

async function deleteRule(ruleId) {
  if (!confirm('Deseja excluir esta regra de nicho?')) return;
  try {
    await fetch(`/api/rules/${ruleId}`, { method: 'DELETE' });
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

// Cria regra exemplo de teologia automaticamente se estiver vazio
async function createDefaultTheologyRule() {
  let chan = channels[0];
  if (!chan) {
    // Cria um canal de teste
    const res = await fetch('/api/channels', {
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
    chan = data.channel;
  }

  if (chan) {
    await fetch(`/api/channels/${chan.id}/rules`, {
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
  }
}

function setupSampleDataIfEmpty() {
  if (channels.length === 0 && allRules.length === 0) {
    // Fica pronto para o usuário adicionar com 1 clique
  }
}
