/* ============================================================
   common.js — 展覽網站共用工具
   給 index.html / works-universe.html / book-list.html / reader-quiz.html
   共用使用，避免同一段邏輯在四個檔案裡各寫一份。
   ============================================================ */

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
  ["pointerdown", "touchstart", "keydown", "mousemove"].forEach(ev =>
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

  function show({ title, qr, url, edition } = {}) {
    if (titleEl && title !== undefined) titleEl.textContent = `《${title}》`;
    if (editionEl && edition !== undefined) editionEl.textContent = edition;
    if (qrEl) qrEl.src = qr || "";
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

  return { show, hide };
}
