/**
 * Ключ Anthropic для вызова из браузера (демо). В продакшене используйте прокси на своём сервере — не публикуйте секрет в клиенте.
 * Задайте до загрузки страницы: window.PDN_ANTHROPIC_API_KEY = "sk-ant-..."
 */
const ANTHROPIC_API_KEY = typeof window !== "undefined" ? window.PDN_ANTHROPIC_API_KEY || "" : "";

const CLAUDE_MODEL = "claude-sonnet-4-20250514";

const tabs = Array.from(document.querySelectorAll(".tab"));
const modes = {
  files: document.getElementById("mode-files"),
  text: document.getElementById("mode-text"),
  url: document.getElementById("mode-url"),
};

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const fileList = document.getElementById("fileList");
const textInput = document.getElementById("textInput");
const urlInput = document.getElementById("urlInput");
const auditBtn = document.getElementById("auditBtn");
const resetBtn = document.getElementById("resetBtn");
const toast = document.getElementById("toast");
const progressBar = document.getElementById("progressBar");

const resultPlaceholder = document.getElementById("resultPlaceholder");
const resultContent = document.getElementById("resultContent");
const resultSummary = document.getElementById("resultSummary");
const resultViolationsLine = document.getElementById("resultViolationsLine");
const resultScore = document.getElementById("resultScore");
const resultAssessment = document.getElementById("resultAssessment");
const aiUnavailableNote = document.getElementById("aiUnavailableNote");
const positivesBlock = document.getElementById("positivesBlock");
const positivesSummary = document.getElementById("positivesSummary");
const positivesList = document.getElementById("positivesList");
const issuesContainer = document.getElementById("issuesContainer");
const downloadReport = document.getElementById("downloadReport");
const offerBox = document.getElementById("offer");
const urlHelpBtn = document.getElementById("urlHelpBtn");
const urlHelp = document.getElementById("urlHelp");

let selectedMode = "files";
let selectedFiles = [];
let isRunning = false;
let scoreAnimTimer = null;

function clearScoreAnimation() {
  if (scoreAnimTimer) {
    clearInterval(scoreAnimTimer);
    scoreAnimTimer = null;
  }
}

function animateScore(el, target) {
  clearScoreAnimation();
  let current = 0;
  const step = Math.max(1, Math.ceil(target / 30));
  el.textContent = "0/100";
  scoreAnimTimer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = `${current}/100`;
    if (current >= target) {
      clearInterval(scoreAnimTimer);
      scoreAnimTimer = null;
    }
  }, 30);
}

const checks = [
  {
    name: "Цели обработки персональных данных",
    regex: /цели обработки персональных данных/u,
    law: "ст.5 ч.2 152-ФЗ",
    description: "Документ должен содержать конкретные цели обработки персональных данных.",
    risk: "Отсутствие целей может привести к признанию обработки незаконной.",
    recommendation:
      "Добавить раздел с конкретными целями обработки (исполнение договора, кадровый учет, обслуживание клиентов).",
  },
  {
    name: "Категории субъектов ПДн",
    regex: /работник|клиент|контрагент|пользователь/u,
    law: "ст.3 152-ФЗ",
    description: "Необходимо определить категории субъектов персональных данных.",
    risk: "Невозможно определить правовое основание обработки.",
    recommendation: "Добавить категории субъектов: работники, кандидаты, клиенты, пользователи сайта.",
  },
  {
    name: "Перечень персональных данных",
    regex: /фамили|имя|телефон|email|адрес/u,
    law: "ст.5 152-ФЗ",
    description: "Нужно указать перечень или категории персональных данных.",
    risk: "Нарушается принцип минимизации данных.",
    recommendation: "Добавить перечень персональных данных.",
  },
  {
    name: "Правовые основания обработки",
    regex: /согласие|исполнение договора|закон/u,
    law: "ст.6 152-ФЗ",
    description: "Должны быть указаны правовые основания обработки.",
    risk: "Обработка может считаться незаконной.",
    recommendation: "Указать основания: согласие, договор, закон.",
  },
  {
    name: "Права субъектов",
    regex: /право на доступ|право на уничтожение|право на уточнение/u,
    law: "ст.14 152-ФЗ",
    description: "Должны быть указаны права субъектов персональных данных.",
    risk: "Субъекты не смогут реализовать свои права.",
    recommendation: "Добавить раздел о правах субъектов.",
  },
  {
    name: "Срок хранения данных",
    regex: /срок хранения|в течение/u,
    law: "ст.5 ч.7 152-ФЗ",
    description: "Нужно определить сроки хранения персональных данных.",
    risk: "Риск хранения данных дольше необходимого.",
    recommendation: "Указать сроки хранения или условия прекращения обработки.",
  },
  {
    name: "Меры защиты",
    regex: /меры защиты|безопасност/u,
    law: "ст.19 152-ФЗ",
    description: "Оператор обязан обеспечить защиту ПДн.",
    risk: "Риск утечки данных.",
    recommendation: "Добавить раздел о мерах защиты.",
  },
  {
    name: "Ответственный за ПДн",
    regex: /ответственн.*персональн/u,
    law: "ст.18.1 152-ФЗ",
    description: "Должно быть назначено ответственное лицо.",
    risk: "Отсутствие ответственного нарушает требования закона.",
    recommendation: "Указать ответственное лицо.",
  },
  {
    name: "Передача третьим лицам",
    regex: /третьим лиц/u,
    law: "ст.6 152-ФЗ",
    description: "Если данные передаются третьим лицам, это должно быть указано.",
    risk: "Передача может считаться незаконной.",
    recommendation: "Добавить описание передачи третьим лицам.",
  },
  {
    name: "Трансграничная передача",
    regex: /трансграничн/u,
    law: "ст.12 152-ФЗ",
    description: "Если есть передача за пределы РФ, это должно быть отражено.",
    risk: "Риск незаконной трансграничной передачи.",
    recommendation: "Добавить описание трансграничной передачи.",
  },
  {
    name: "Контактные данные оператора",
    regex: /адрес|email|телефон/u,
    law: "ст.18.1 152-ФЗ",
    description: "Документ должен содержать контакты оператора.",
    risk: "Субъекты не смогут обратиться к оператору.",
    recommendation: "Добавить адрес, телефон и email оператора.",
  },
  {
    name: "Обработка ПДн",
    regex: /обработк.*персональн/u,
    law: "ст.3 152-ФЗ",
    description: "Документ должен описывать операции обработки.",
    risk: "Непрозрачность обработки данных.",
    recommendation: "Добавить описание операций обработки.",
  },
  {
    name: "Уничтожение данных",
    regex: /уничтожени/u,
    law: "ст.21 152-ФЗ",
    description: "Должен быть описан порядок уничтожения данных.",
    risk: "Нарушение принципа ограничения хранения.",
    recommendation: "Добавить порядок уничтожения данных.",
  },
  {
    name: "Обезличивание данных",
    regex: /обезличиван/u,
    law: "ст.3 152-ФЗ",
    description: "Если используется аналитика, должно быть обезличивание.",
    risk: "Риск обработки лишних данных.",
    recommendation: "Добавить описание обезличивания.",
  },
  {
    name: "Политика конфиденциальности",
    regex: /политик.*персональн/u,
    law: "ст.18.1 152-ФЗ",
    description: "Политика обработки ПДн должна быть опубликована.",
    risk: "Нарушение требований публичности.",
    recommendation: "Добавить раздел политики конфиденциальности.",
  },
  {
    name: "Согласие на обработку",
    regex: /даю согласие|согласие на обработку/u,
    law: "ст.9 152-ФЗ",
    description: "Согласие должно содержать обязательные элементы.",
    risk: "Согласие может считаться недействительным.",
    recommendation: "Добавить форму согласия.",
  },
  {
    name: "Срок действия согласия",
    regex: /срок действия согласия/u,
    law: "ст.9 152-ФЗ",
    description: "Согласие должно иметь срок действия.",
    risk: "Согласие может быть признано некорректным.",
    recommendation: "Указать срок действия согласия.",
  },
  {
    name: "Категории ПДн",
    regex: /категории персональных данных/u,
    law: "ст.5 152-ФЗ",
    description: "Необходимо указать категории персональных данных.",
    risk: "Отсутствие контроля за объемом данных.",
    recommendation: "Добавить категории ПДн.",
  },
  {
    name: "Доступ сотрудников",
    regex: /допуск.*персональн/u,
    law: "ст.18.1 152-ФЗ",
    description: "Нужно определить круг лиц с доступом к ПДн.",
    risk: "Риск несанкционированного доступа.",
    recommendation: "Указать список допущенных сотрудников.",
  },
  {
    name: "Журнал обращений",
    regex: /обращени.*субъект/u,
    law: "ст.14 152-ФЗ",
    description: "Оператор должен учитывать обращения субъектов.",
    risk: "Риск нарушения прав субъектов.",
    recommendation: "Ввести журнал обращений субъектов ПДн.",
  },
];

const pdnKeywords = [
  "пдн",
  "персональные данные",
  "персональных данных",
  "152-фз",
  "152 фз",
  "оператор персональных данных",
  "обработка персональных данных",
  "политика конфиденциальности",
  "согласие на обработку",
];

if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
}

function hideToast() {
  toast.textContent = "";
  toast.classList.remove("show");
}

function setMode(mode) {
  selectedMode = mode;
  tabs.forEach((tab) => {
    const isActive = tab.dataset.mode === mode;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
  Object.entries(modes).forEach(([key, el]) => {
    el.classList.toggle("active", key === mode);
  });
  hideToast();
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => setMode(tab.dataset.mode));
});

if (urlHelpBtn && urlHelp) {
  urlHelpBtn.addEventListener("click", () => {
    urlHelp.open = true;
    urlHelp.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "";
  const units = ["Б", "КБ", "МБ", "ГБ"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const precision = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim();
}

function isPdnRelated(text) {
  return pdnKeywords.some((kw) => text.includes(kw));
}

function renderFiles() {
  fileList.innerHTML = "";
  if (!selectedFiles.length) return;

  selectedFiles.forEach((file, index) => {
    const row = document.createElement("div");
    row.className = "file-item";
    row.innerHTML = `
      <div>
        <span class="file-name">${escapeHtml(file.name)}</span>
        <span class="file-meta">${formatBytes(file.size)} · ${escapeHtml(file.type || "тип не определен")}</span>
      </div>
      <button class="remove-file" type="button" data-index="${index}">Удалить</button>
    `;
    fileList.appendChild(row);
  });

  fileList.querySelectorAll(".remove-file").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.index);
      selectedFiles.splice(idx, 1);
      renderFiles();
    });
  });
}

function mergeFiles(nextFiles) {
  const signature = new Set(selectedFiles.map((f) => `${f.name}_${f.size}_${f.lastModified}`));
  nextFiles.forEach((file) => {
    const key = `${file.name}_${file.size}_${file.lastModified}`;
    if (!signature.has(key)) {
      selectedFiles.push(file);
      signature.add(key);
    }
  });
  renderFiles();
}

fileInput.addEventListener("change", () => {
  mergeFiles(Array.from(fileInput.files || []));
  fileInput.value = "";
});

["dragenter", "dragover"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove("dragover");
  });
});

dropzone.addEventListener("drop", (event) => {
  mergeFiles(Array.from(event.dataTransfer?.files || []));
});

dropzone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    fileInput.click();
  }
});

function runChecks(text) {
  return checks.map((check) => ({ ...check, status: check.regex.test(text) }));
}

function getInputValidationError() {
  if (selectedMode === "url") {
    return "Проверка по прямой ссылке в браузере недоступна. Скопируйте текст политики во вкладку «Текст» или загрузите файл.";
  }
  if (selectedMode === "files" && selectedFiles.length === 0) {
    return "Загрузите хотя бы один файл.";
  }
  if (selectedMode === "text" && !textInput.value.trim()) {
    return "Вставьте текст документа.";
  }
  return "";
}

function setAuditLoading(loading) {
  auditBtn.disabled = loading;
  auditBtn.classList.toggle("loading", loading);
  const label = auditBtn.querySelector(".btn-label");
  if (label) label.textContent = loading ? "Проверяем..." : "Проверить документ";
}

function hideOffer() {
  offerBox.style.display = "none";
  offerBox.style.opacity = "0";
}

function showOffer() {
  offerBox.style.display = "block";
  requestAnimationFrame(() => {
    offerBox.style.opacity = "1";
  });
}

function resetResultUi() {
  clearScoreAnimation();
  resultScore.textContent = "";
  resultPlaceholder.hidden = false;
  resultContent.hidden = true;
  resultSummary.hidden = true;
  resultSummary.classList.remove("high", "medium", "low");
  positivesBlock.hidden = true;
  positivesList.innerHTML = "";
  issuesContainer.innerHTML = "";
  aiUnavailableNote.hidden = true;
  aiUnavailableNote.textContent = "";
  downloadReport.hidden = true;
  hideOffer();
}

function showErrorState(title, messages) {
  clearScoreAnimation();
  resultPlaceholder.hidden = true;
  resultContent.hidden = false;
  resultSummary.hidden = false;
  resultSummary.classList.remove("high", "medium", "low");
  resultSummary.classList.add("high");
  resultViolationsLine.textContent = title;
  resultScore.textContent = "—";
  resultAssessment.textContent = messages.join(" ");
  positivesBlock.hidden = true;
  issuesContainer.innerHTML = "";
  aiUnavailableNote.hidden = true;
  downloadReport.hidden = true;
  hideOffer();
}

function parseAiJson(rawText) {
  const cleaned = String(rawText || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  return JSON.parse(cleaned);
}

async function runAiAudit(documentText, regexResults) {
  const failedChecks = regexResults
    .filter((r) => !r.status)
    .map((r) => `- ${r.name} (${r.law})`)
    .join("\n");

  const prompt = `Ты — эксперт по российскому законодательству в сфере персональных данных (152-ФЗ).

Тебе передан текст документа по ПДн и список несоответствий, найденных автоматической проверкой.

ТЕКСТ ДОКУМЕНТА (первые 4000 символов):
${documentText.slice(0, 4000)}

НАЙДЕННЫЕ НЕСООТВЕТСТВИЯ:
${failedChecks || "Автоматическая проверка не нашла нарушений"}

Задача:
1. Подтверди или скорректируй найденные несоответствия на основе реального текста документа
2. Найди дополнительные нарушения, которые пропустила автоматическая проверка
3. Для каждого нарушения укажи: суть проблемы, норму закона, конкретную рекомендацию по исправлению
4. Дай общую оценку: насколько документ соответствует требованиям РКН

Отвечай строго в формате JSON:
{
  "overallAssessment": "краткая оценка 1-2 предложения",
  "riskLevel": "low|medium|high",
  "issues": [
    {
      "title": "название нарушения",
      "law": "ст. X 152-ФЗ",
      "problem": "описание проблемы",
      "recommendation": "что конкретно добавить или изменить"
    }
  ],
  "positives": ["что в документе сделано правильно"]
}`;

  if (!ANTHROPIC_API_KEY) {
    throw new Error("API_KEY_MISSING");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const block = data.content?.[0];
  const text = block?.type === "text" ? block.text : "";
  try {
    return parseAiJson(text);
  } catch {
    throw new Error("INVALID_AI_JSON");
  }
}

function renderRegexIssueCards(failedItems) {
  issuesContainer.innerHTML = "";
  failedItems.forEach((item, idx) => {
    const card = document.createElement("div");
    card.className = "audit-item";
    card.innerHTML = `
      <h4>${idx + 1}. ${escapeHtml(item.name)}</h4>
      <p><b>Норма:</b> ${escapeHtml(item.law)}</p>
      <p><b>Риск:</b> ${escapeHtml(item.risk)}</p>
      <p><b>Рекомендация:</b> ${escapeHtml(item.recommendation)}</p>
    `;
    issuesContainer.appendChild(card);
  });
}

function renderAiIssueCards(issues) {
  issuesContainer.innerHTML = "";
  (issues || []).forEach((item, idx) => {
    const card = document.createElement("div");
    card.className = "audit-item";
    card.innerHTML = `
      <h4>${idx + 1}. ${escapeHtml(item.title || "Замечание")}</h4>
      <p><b>Норма:</b> ${escapeHtml(item.law || "—")}</p>
      <p><b>Проблема:</b> ${escapeHtml(item.problem || "—")}</p>
      <p><b>Рекомендация:</b> ${escapeHtml(item.recommendation || "—")}</p>
    `;
    issuesContainer.appendChild(card);
  });
}

function applyRiskClass(level) {
  resultSummary.classList.remove("high", "medium", "low");
  const l = String(level || "medium").toLowerCase();
  if (l === "high") resultSummary.classList.add("high");
  else if (l === "low") resultSummary.classList.add("low");
  else resultSummary.classList.add("medium");
}

function renderPositives(items) {
  positivesList.innerHTML = "";
  if (!items || !items.length) {
    positivesBlock.hidden = true;
    return;
  }
  positivesBlock.hidden = false;
  positivesSummary.textContent = `Что в порядке (${items.length})`;
  items.forEach((line) => {
    const li = document.createElement("li");
    li.textContent = line;
    positivesList.appendChild(li);
  });
}

function scrollToResult() {
  document.getElementById("result")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function extractTextFromDocx(file) {
  if (!window.mammoth) throw new Error("Mammoth.js не загружен");
  const buffer = await file.arrayBuffer();
  const result = await window.mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value || "";
}

async function extractTextFromPdf(file) {
  if (!window.pdfjsLib) throw new Error("pdf.js не загружен");
  const buffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: buffer }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += ` ${content.items.map((item) => item.str).join(" ")}`;
  }
  return text;
}

async function extractTextFromFile(file) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";

  if (ext === "docx") return extractTextFromDocx(file);
  if (ext === "pdf") return extractTextFromPdf(file);
  if (ext === "txt" || ext === "md" || ext === "html" || ext === "htm" || ext === "rtf") {
    return file.text();
  }

  return `${file.name} ${file.type || ""}`;
}

async function extractSourceText() {
  if (selectedMode === "text") return textInput.value;
  if (selectedMode === "url") {
    throw new Error("Режим URL отключён в браузере");
  }
  const chunks = [];
  for (const file of selectedFiles) {
    chunks.push(await extractTextFromFile(file));
  }
  return chunks.join("\n");
}

async function runAudit() {
  if (isRunning) return;
  hideToast();
  resetResultUi();

  const validationError = getInputValidationError();
  if (validationError) {
    progressBar.style.width = "0%";
    showToast(validationError);
    showErrorState("Нужны данные", [validationError]);
    scrollToResult();
    return;
  }

  isRunning = true;
  setAuditLoading(true);

  try {
    progressBar.classList.add("running");
    progressBar.style.width = "15%";
    const sourceText = await extractSourceText();
    const normalized = normalizeText(sourceText);

    if (!isPdnRelated(normalized)) {
      progressBar.style.width = "0%";
      showErrorState("Документ не похож на материал по ПДн", [
        "Не обнаружено типичных формулировок о персональных данных и 152-ФЗ.",
        "Загрузите политику, согласие, уведомление или другой документ по ПДн.",
      ]);
      showToast("Похоже, это не документ по ПДн. Загрузите корректный файл или текст.");
      scrollToResult();
      return;
    }

    const regexResults = runChecks(normalized);
    const passed = regexResults.filter((r) => r.status).length;
    const score = Math.round((passed / regexResults.length) * 100);
    progressBar.style.width = "40%";

    let aiResult = null;
    let aiError = null;
    try {
      aiResult = await runAiAudit(sourceText, regexResults);
      if (!aiResult || typeof aiResult !== "object") throw new Error("INVALID_AI_JSON");
    } catch (e) {
      const msg = e.message || "";
      if (msg === "API_KEY_MISSING") aiError = "NO_KEY";
      else if (msg === "INVALID_AI_JSON") aiError = "BAD_JSON";
      else aiError = msg;
      aiResult = null;
    }

    progressBar.style.width = "100%";

    resultPlaceholder.hidden = true;
    resultContent.hidden = false;
    resultSummary.hidden = false;

    if (aiResult && Array.isArray(aiResult.issues)) {
      applyRiskClass(aiResult.riskLevel);
      const n = aiResult.issues.length;
      resultViolationsLine.textContent = n ? `Найдено замечаний: ${n}` : "Критичных замечаний по разбору не выявлено";
      animateScore(resultScore, score);
      resultAssessment.textContent = aiResult.overallAssessment || "Оценка сформирована.";
      aiUnavailableNote.hidden = true;
      renderPositives(aiResult.positives);
      renderAiIssueCards(aiResult.issues);
    } else {
      applyRiskClass("medium");
      const failed = regexResults.filter((r) => !r.status);
      resultViolationsLine.textContent = failed.length
        ? `Найдено несоответствий по чек-листу: ${failed.length}`
        : "Несоответствий по чек-листу не найдено";
      animateScore(resultScore, score);
      resultAssessment.textContent =
        failed.length === 0
          ? "По автоматической проверке существенных пробелов не выявлено. Для углублённого разбора формулировок подключите ИИ через серверный прокси."
          : "Ниже — результаты автоматической проверки. ИИ-анализ временно недоступен.";
      aiUnavailableNote.hidden = false;
      aiUnavailableNote.textContent =
        aiError === "NO_KEY"
          ? "ИИ-анализ недоступен: задайте ключ API на сервере или в window.PDN_ANTHROPIC_API_KEY для демо."
          : aiError === "BAD_JSON"
            ? "Ответ сервиса не удалось разобрать. Показан отчёт автоматической проверки."
            : "ИИ-анализ временно недоступен. Показан отчёт автоматической проверки.";
      renderPositives([]);
      if (failed.length) renderRegexIssueCards(failed);
      else issuesContainer.innerHTML = '<p class="muted">Дополнительных замечаний по чек-листу нет.</p>';
    }

    downloadReport.hidden = false;
    showOffer();
    showToast("Проверка завершена.");
    scrollToResult();
  } catch (error) {
    progressBar.style.width = "0%";
    showErrorState("Ошибка", [
      "Не удалось обработать документ.",
      error.message || "Попробуйте другой файл или формат.",
    ]);
    showToast("Ошибка обработки. Проверьте файл и повторите попытку.");
    scrollToResult();
  } finally {
    isRunning = false;
    progressBar.classList.remove("running");
    setAuditLoading(false);
  }
}

downloadReport?.addEventListener("click", () => {
  window.print();
});

function resetAll() {
  selectedFiles = [];
  renderFiles();
  textInput.value = "";
  urlInput.value = "";
  progressBar.style.width = "0%";
  progressBar.classList.remove("running");
  hideToast();
  setMode("files");
  resetResultUi();
}

auditBtn.addEventListener("click", runAudit);
resetBtn.addEventListener("click", resetAll);

const headerEl = document.querySelector(".header");
if (headerEl) {
  window.addEventListener(
    "scroll",
    () => {
      headerEl.classList.toggle("scrolled", window.scrollY > 20);
    },
    { passive: true }
  );
}

const fadeObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        fadeObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
);

document.querySelectorAll(".fade-in").forEach((el) => fadeObserver.observe(el));
