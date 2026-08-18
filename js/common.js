/* ============================================================
   common.js — 展覽網站共用工具
   給 index.html / works-universe.html / book-list.html / reader-quiz.html
   共用使用，避免同一段邏輯在四個檔案裡各寫一份。
   ============================================================ */

/* ===== 三語系統共用設定與工具 =====
   LANGUAGE_CONFIG / normalizeLang / resolveInitialLanguage / withCurrentLang /
   formatText / updateLangButtons / esc 這幾個函式原本在四個頁面裡
   幾乎逐字複製了一份，而且久了已經悄悄「跑掉」（例如 normalizeLang
   對 zh_tw、ja-jp、en-fr 的支援四個頁面不一致）。統一放這裡之後，
   只要改一個地方，四個頁面就會同步生效。
   各頁仍然自己保有 currentLang 這個變數（因為切換語言時要重新
   render 該頁的內容），只是把「怎麼判斷/轉換語言」的邏輯集中管理。
*/
const LANGUAGE_CONFIG = {
  "zh-Hant": { query: "zh", htmlLang: "zh-Hant" },
  "ja": { query: "ja", htmlLang: "ja" },
  "en": { query: "en", htmlLang: "en" }
};

/**
 * 把使用者輸入（網址參數、localStorage 內容等）正規化成
 * "zh-Hant" / "ja" / "en" 三選一，無法辨識則回傳 null。
 */
function normalizeLang(value) {
  if (!value) return null;
  const v = String(value).toLowerCase();
  if (["zh", "zh-hant", "zh_tw", "zh-tw"].includes(v)) return "zh-Hant";
  if (["ja", "jp", "ja-jp"].includes(v)) return "ja";
  if (v === "en" || v.startsWith("en-")) return "en";
  return null;
}

/**
 * 決定頁面載入時該用哪個語言：網址 ?lang= 優先，
 * 其次是 localStorage 記住的語言，都沒有就預設繁中。
 * @param {string} [storageKey="truthAfterLang"] - localStorage 的 key，四頁統一用同一把。
 */
function resolveInitialLanguage(storageKey = "truthAfterLang") {
  const params = new URLSearchParams(window.location.search);
  return normalizeLang(params.get("lang")) ||
         normalizeLang(localStorage.getItem(storageKey)) ||
         "zh-Hant";
}

/**
 * 產生「帶著目前語言」的站內連結（只取檔名 + query + hash，
 * 避免帶著完整網域跳轉時出錯）。
 * @param {string} path - 目標頁面路徑，例如 "./index.html"
 * @param {string} currentLang - 呼叫端目前的語言（"zh-Hant" | "ja" | "en"）
 */
function withCurrentLang(path, currentLang) {
  const url = new URL(path, window.location.href);
  url.searchParams.set("lang", LANGUAGE_CONFIG[currentLang].query);
  return `${url.pathname.split("/").pop()}${url.search}${url.hash}`;
}

/**
 * 簡易字串樣板替換：把 "{current}" 換成 vars.current。
 */
function formatText(text, vars = {}) {
  return String(text).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

/**
 * 依 currentLang 更新畫面上所有 .lang-btn 的 active 狀態與 aria-pressed。
 */
function updateLangButtons(currentLang) {
  document.querySelectorAll(".lang-btn").forEach(btn => {
    const active = btn.dataset.lang === currentLang;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

/**
 * 依語言幫書名包上對應的符號：中文《》、日文『』、英文不加符號。
 * 共用這份，book-list.html 跟 works-universe.html 才不會各自寫一次、
 * 而且未來要調整符號規則時只需要改一個地方。
 * @param {string} title - 書名本身，不含符號
 * @param {string} lang - 這個書名所屬的語言（"zh-Hant" | "ja" | "en"），
 *   注意：不一定等於畫面目前的 currentLang——例如書單頁的「日文版館藏」
 *   按鈕，即使頁面目前是中文模式，書名本身仍是日文書名，要用日文符號。
 */
function wrapBookTitle(title, lang) {
  if (lang === "ja") return `『${title}』`;
  if (lang === "en") return title;
  return `《${title}》`;
}

/**
 * HTML escape，避免把資料字串（書名、簡介等）直接塞進 innerHTML 時
 * 被當成標籤解析。四個頁面統一用這一份，而不是只有 book-list.html 有。
 */
function esc(s) {
  return String(s).replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[m]));
}

/**
 * 是否為手機／個人裝置的簡易判斷（以視窗寬度為準，跟版面上的
 * RWD 中斷點一致）。用來決定要不要啟用「展場 kiosk」式的閒置重置。
 */
function isMobileViewport() {
  return window.matchMedia("(max-width:768px)").matches;
}

/**
 * 建立一個「僅在展場觸控螢幕（非手機）才會啟用」的閒置計時器。
 *
 * 背景：手機是使用者的個人裝置，不該因為看畫面看得比較久，
 * 就被自動重置進度或關掉正在看的內容；只有現場展場的觸控螢幕
 * 才需要「訪客離開後自動恢復初始狀態」這種 kiosk 行為。
 * 這個函式把「是否為手機」的判斷統一收在這裡，
 * 避免四個頁面各自決定、行為不一致（例如某頁忘記排除手機）。
 *
 * @param {Function} onIdle - 閒置時間到了要執行的函式
 * @param {number} timeoutMs - 閒置多久算「閒置」，預設 60000ms（60 秒）
 * @returns {Function|null} reset - 手機裝置上不會啟用計時器，回傳 null
 */
function createKioskIdleTimer(onIdle, timeoutMs = 60000) {
  if (isMobileViewport()) return null;
  return createIdleTimer(onIdle, timeoutMs);
}

/**
 * 建立一個「閒置自動重置」計時器。
 * 觸控螢幕模式常見需求：使用者超過一段時間沒有操作，就自動做某件事
 * （例如回到首頁、關閉面板、重置測驗）。
 *
 * @param {Function} onIdle - 閒置時間到了要執行的函式
 * @param {number} timeoutMs - 閒置多久算「閒置」，預設 60000ms（60 秒）
 * @returns {Function} reset - 手動重置計時器的函式（通常不需要自己呼叫）
 */
function createIdleTimer(onIdle, timeoutMs = 60000) {
  let timer;
  function reset() {
    clearTimeout(timer);
    timer = setTimeout(onIdle, timeoutMs);
  }
  ["pointerdown", "keydown", "wheel"].forEach(ev =>
    document.addEventListener(ev, reset, { passive: true })
  );
  reset();
  return reset;
}

/**
 * 初始化「館藏 QR Code」彈出視窗。works-universe.html 和 book-list.html
 * 都有幾乎一樣的彈窗（標題、QR 圖、館藏網址、關閉按鈕），這裡統一成一份。
 *
 * @param {Object} ids - 頁面上對應元素的 id
 * @param {string} ids.modalId    - 彈窗外層容器 id（必填）
 * @param {string} ids.qrImgId    - QR code <img> 的 id（必填）
 * @param {string} ids.urlId      - 顯示網址文字的元素 id（必填）
 * @param {string} [ids.titleId]  - 顯示書名的元素 id（選填）
 * @param {string} [ids.editionId]- 顯示「中文版館藏／日文版館藏」等字樣的元素 id（選填）
 * @param {string} [ids.closeId]  - 關閉按鈕 id（選填，沒有的話仍可點背景關閉）
 * @returns {{show: Function, hide: Function} | null}
 */
function initCatalogModal({ modalId, qrImgId, urlId, titleId, editionId, closeId }) {
  const modal = document.getElementById(modalId);
  if (!modal) return null;

  const titleEl = titleId ? document.getElementById(titleId) : null;
  const editionEl = editionId ? document.getElementById(editionId) : null;
  const qrEl = document.getElementById(qrImgId);
  const urlEl = document.getElementById(urlId);
  const closeBtn = closeId ? document.getElementById(closeId) : null;

  // title 現在預期是「呼叫端已經格式化好、可以直接顯示」的完整標題
  // （例如中文書名要自己包好《》、日文書名要自己包好『』、英文書名不需要符號）。
  // common.js 不再自動幫忙加《》，因為中／日／英三語的書名符號並不一樣，
  // 由這裡統一硬加反而會在英文模式或跨語系情境下加錯符號。
  function show({ title, qr, url, edition } = {}) {
    if (titleEl && title !== undefined) titleEl.textContent = title;
    if (editionEl && edition !== undefined) editionEl.textContent = edition;
    if (qrEl) {
      if (qr) {
        qrEl.src = qr;
        qrEl.style.display = "";
      } else {
        qrEl.removeAttribute("src");
        qrEl.style.display = "none";
      }
    }
    if (urlEl) urlEl.textContent = url || "";
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
  }

  function hide() {
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
  }

  if (closeBtn) closeBtn.addEventListener("click", hide);

  modal.addEventListener("click", e => {
    if (e.target === modal) hide();
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && modal.classList.contains("show")) {
      hide();
    }
  });

  return { show, hide };
}
