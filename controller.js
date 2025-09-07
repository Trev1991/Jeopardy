// Orchestrates fetch -> build -> render -> events with guardrails
import {
    boardEl,
    restartBtn,
    NUM_CATEGORIES,
    CLUES_PER_CATEGORY,
    setCategories,
    categories
} from "./state.js";

import { fetchMixedCluePool, buildCategoriesFromPool } from "./api.js";
import { clearBoard, renderHeaders, renderCells, advanceCell } from "./ui.js";

// small sleep
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// concurrency + cancellation controls
let loading = false;
let loadSeq = 0;
let inflightCtrl = null;

export function onCellClick(e) {
    advanceCell(e.currentTarget);
}

export async function initBoard() {
    if (loading) return;            // avoid overlap
    loading = true;
    restartBtn.disabled = true;
    const seq = ++loadSeq;

    // cancel previous fetch, if any
    if (inflightCtrl) inflightCtrl.abort();
    const ctrl = new AbortController();
    inflightCtrl = ctrl;
    const signal = ctrl.signal;
    const timeoutId = setTimeout(() => ctrl.abort(), 8000); // 8s timeout

    try {
        clearBoard();
        boardEl.textContent = "Loading…";

        let built = [];
        // up to 3 attempts with tiny backoff (handles thin pools/transient throttling)
        for (let attempt = 1; attempt <= 3; attempt++) {
            const pool = await fetchMixedCluePool(80, { signal });
            built = buildCategoriesFromPool(pool, NUM_CATEGORIES, CLUES_PER_CATEGORY);
            if (built.length === NUM_CATEGORIES) break;
            await sleep(300 * attempt + Math.floor(Math.random() * 200));
        }

        // if a newer init started, drop these results
        if (seq !== loadSeq) return;

        if (built.length < NUM_CATEGORIES) {
            boardEl.textContent = "Couldn’t generate a full board. Please try again.";
            return;
        }

        setCategories(built);
        clearBoard();
        renderHeaders(categories);
        renderCells(categories, onCellClick);
    } catch (err) {
        if (err?.name === "AbortError") {
            if (seq === loadSeq) boardEl.textContent = "Network took too long. Try Restart.";
        } else {
            console.error("INIT ERROR:", {
                message: err?.message,
                code: err?.code,
                status: err?.response?.status,
                data: err?.response?.data
            });
            boardEl.textContent = "Failed to load questions. See console.";
        }
    } finally {
        clearTimeout(timeoutId);
        if (seq === loadSeq) {
            loading = false;
            restartBtn.disabled = false;
            inflightCtrl = null;
        }
    }
}

export function registerGlobalEvents() {
    restartBtn.addEventListener("click", () => {
        initBoard().catch((err) => {
            console.error(err);
            boardEl.textContent = "Could not refresh. See console.";
        });
    });
}
