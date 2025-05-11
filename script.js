// Armazenamento local
let lancamentos = JSON.parse(localStorage.getItem("lancamentos")) || [];

// Elementos DOM
const form = document.getElementById("form-lancamento");
const listaEl = document.getElementById("listaTransacoes");
const totalReceitasEl = document.getElementById("totalReceitas");
const totalDespesasEl = document.getElementById("totalDespesas");
const saldoAtualEl = document.getElementById("saldoAtual");
const badgeEl = document.getElementById("badgeTotal");
const cardSaldoEl = document.getElementById("cardSaldo");
let graficoPizza, graficoBarra, graficoLinha, graficoStacked;

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const tipo = document.getElementById("tipo").value;
  const descricao = document.getElementById("descricao").value.trim();
  const valor = parseFloat(document.getElementById("valor").value);
  const data = new Date().toLocaleDateString();

  if (!descricao || isNaN(valor)) {
    alert("⚠️ Preencha todos os campos corretamente!");
    return;
  }

  lancamentos.push({ tipo, descricao, valor, data });
  salvarEAtualizar();
  form.reset();
});

function salvarEAtualizar() {
  localStorage.setItem("lancamentos", JSON.stringify(lancamentos));
  renderizarLista();
  atualizarTotais();
  atualizarGraficos();
  calcularMediaMensal();
}

function renderizarLista() {
  listaEl.innerHTML = "";
  lancamentos.forEach((item) => {
    const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between align-items-center";
    li.innerHTML = `
      <span>${item.tipo === 'receita' ? '💰' : '💸'} ${item.descricao} <small class="text-muted">(${item.data})</small></span>
      <span>R$ ${item.valor.toFixed(2)}</span>
    `;
    listaEl.appendChild(li);
  });
  badgeEl.innerText = lancamentos.length;
}

function atualizarTotais() {
  let receitas = 0, despesas = 0;

  lancamentos.forEach(({ tipo, valor }) => {
    tipo === "receita" ? receitas += valor : despesas += valor;
  });

  const saldo = receitas - despesas;

  totalReceitasEl.textContent = `💵 R$ ${receitas.toFixed(2)}`;
  totalDespesasEl.textContent = `🧾 R$ ${despesas.toFixed(2)}`;
  saldoAtualEl.textContent = `${saldo >= 0 ? '📈' : '📉'} R$ ${saldo.toFixed(2)}`;

  atualizarCorSaldo(saldo);
}

function atualizarCorSaldo(saldo) {
  cardSaldoEl.classList.remove("border-success", "border-danger");
  if (saldo >= 0) {
    cardSaldoEl.classList.add("border-success");
  } else {
    cardSaldoEl.classList.add("border-danger");
  }
}

function calcularMediaMensal() {
  const meses = {};
  lancamentos.forEach(({ valor }) => {
    const mes = new Date().getMonth();
    meses[mes] = (meses[mes] || 0) + valor;
  });
  const totalMeses = Object.keys(meses).length;
  const media = Object.values(meses).reduce((acc, val) => acc + val, 0) / totalMeses;
  console.log(`📅 Média mensal: R$ ${media.toFixed(2)}`);
}

function exportarExcel(tipo = "xlsx") {
  const ws = XLSX.utils.json_to_sheet(lancamentos);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Orcamento");
  XLSX.writeFile(wb, `orcamento-wesley-fonseca.${tipo}`);
}

function importarArquivo(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const imported = XLSX.utils.sheet_to_json(sheet);

    if (Array.isArray(imported)) {
      lancamentos = imported.map(item => ({
        tipo: item.tipo || "despesa",
        descricao: item.descricao || "Sem descrição",
        valor: parseFloat(item.valor) || 0,
        data: item.data || new Date().toLocaleDateString()
      }));
      salvarEAtualizar();
    } else {
      alert("❌ Arquivo inválido!");
    }
  };
  reader.readAsArrayBuffer(file);
}

function atualizarGraficos() {
  const categorias = {};
  const mensal = {};
  const saldoDiario = {};
  const receitaMes = {};
  const despesaMes = {};

  lancamentos.forEach(({ tipo, descricao, valor, data }) => {
    const dia = data;
    const mes = data.split("/")[1];

    if (tipo === "despesa") {
      categorias[descricao] = (categorias[descricao] || 0) + valor;
      despesaMes[mes] = (despesaMes[mes] || 0) + valor;
    }
    if (tipo === "receita") {
      receitaMes[mes] = (receitaMes[mes] || 0) + valor;
    }
    saldoDiario[dia] = (saldoDiario[dia] || 0) + (tipo === "receita" ? valor : -valor);
  });

  const labelsPizza = Object.keys(categorias);
  const dadosPizza = Object.values(categorias);

  if (graficoPizza) graficoPizza.destroy();
  graficoPizza = new Chart(document.getElementById("graficoPizza"), {
    type: "pie",
    data: {
      labels: labelsPizza,
      datasets: [{ data: dadosPizza, backgroundColor: ["#dc3545", "#ffc107", "#0d6efd", "#198754"] }]
    }
  });

  const labelsBarra = Object.keys(despesaMes);
  const dadosBarra = Object.values(despesaMes);

  if (graficoBarra) graficoBarra.destroy();
  graficoBarra = new Chart(document.getElementById("graficoBarra"), {
    type: "bar",
    data: {
      labels: labelsBarra,
      datasets: [{ label: "📊 Despesas por mês", data: dadosBarra, backgroundColor: "#0d6efd" }]
    }
  });

  const labelsLinha = Object.keys(saldoDiario);
  const dadosLinha = Object.values(saldoDiario);

  if (graficoLinha) graficoLinha.destroy();
  graficoLinha = new Chart(document.getElementById("graficoLinha"), {
    type: "line",
    data: {
      labels: labelsLinha,
      datasets: [{ label: "📈 Saldo Diário", data: dadosLinha, borderColor: "#198754", fill: false }]
    }
  });

  const labelsStack = Object.keys(receitaMes);
  if (graficoStacked) graficoStacked.destroy();
  graficoStacked = new Chart(document.getElementById("graficoStacked"), {
    type: "bar",
    data: {
      labels: labelsStack,
      datasets: [
        { label: "Receitas", data: labelsStack.map(m => receitaMes[m] || 0), backgroundColor: "#198754" },
        { label: "Despesas", data: labelsStack.map(m => despesaMes[m] || 0), backgroundColor: "#dc3545" }
      ]
    },
    options: {
      plugins: { title: { display: true, text: "Receitas vs Despesas Mensais" } },
      responsive: true,
      scales: { x: { stacked: true }, y: { stacked: true } }
    }
  });
}

function limparTudo() {
  if (confirm("❗ Deseja apagar todos os dados?")) {
    localStorage.clear();
    lancamentos = [];
    salvarEAtualizar();
  }
}

// Tooltips Bootstrap
document.addEventListener("DOMContentLoaded", () => {
  const tooltips = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltips.map((el) => new bootstrap.Tooltip(el));
});

// Inicialização
document.addEventListener("DOMContentLoaded", salvarEAtualizar);

// Armazenamento local


form.addEventListener("submit", (e) => {
  e.preventDefault();

  const tipo = document.getElementById("tipo").value;
  const descricao = document.getElementById("descricao").value.trim();
  const valor = parseFloat(document.getElementById("valor").value);
  const data = new Date().toLocaleDateString();

  if (!descricao || isNaN(valor)) {
    alert("⚠️ Preencha todos os campos corretamente!");
    return;
  }

  lancamentos.push({ tipo, descricao, valor, data });
  salvarEAtualizar();
  form.reset();
});

function salvarEAtualizar() {
  localStorage.setItem("lancamentos", JSON.stringify(lancamentos));
  renderizarLista();
  atualizarTotais();
  atualizarGraficos();
  calcularMediaMensal();
}

function renderizarLista() {
  listaEl.innerHTML = "";
  lancamentos.forEach((item, index) => {
    const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between align-items-center";
    li.innerHTML = `
      <div class="transaction-item">
        <div class="transaction-left">
          <span>${item.tipo === 'receita' ? '💰' : '💸'} ${item.descricao} <small class="text-muted">(${item.data})</small></span>
        </div>
        <div>
          <span>R$ ${item.valor.toFixed(2)}</span>
          <button class="delete-btn" onclick="deletarTransacao(${index})" title="Excluir">❌</button>
        </div>
      </div>
    `;
    listaEl.appendChild(li);
  });
  badgeEl.innerText = lancamentos.length;
}

function deletarTransacao(index) {
  if (confirm("Deseja realmente excluir esta transação?")) {
    lancamentos.splice(index, 1);
    salvarEAtualizar();
  }
}

// ... restante do código permanece o mesmo ...
