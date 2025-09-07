// DOM building and updates
import { boardEl, CLUES_PER_CATEGORY } from "./state.js";

/** Remove all existing board content */
export function clearBoard() {
    boardEl.innerHTML = "";
}

/** Helper: open the full-text modal for the current side */
function openClueModal(cell) {
    const modal = document.getElementById("clueModal");
    const textEl = document.getElementById("clueText");
    if (!modal || !textEl || typeof modal.showModal !== "function") return;

    const state = cell.dataset.state;
    textEl.textContent =
        state === "answer" ? cell.dataset.a :
            state === "question" ? cell.dataset.q :
                cell.dataset.q; // if hidden, show the question
    modal.showModal(); // native, modal dialog with backdrop & focus trapping
}

/** Render the column headers for each category */
export function renderHeaders(categories) {
    for (const cat of categories) {
        const h = document.createElement("div");
        h.className = "col-header";
        h.textContent = cat.title.toUpperCase();
        boardEl.appendChild(h);
    }
}

/** Render a CLUES_PER_CATEGORY x categories.length grid of clickable "cards" */
export function renderCells(categories, onCellClick) {
    for (let row = 0; row < CLUES_PER_CATEGORY; row++) {
        for (let col = 0; col < categories.length; col++) {
            const clue = categories[col].clues[row];

            const cell = document.createElement("div");
            cell.className = "cell";
            cell.tabIndex = 0;

            // inner card + faces
            const card = document.createElement("div");
            card.className = "card";

            const front = document.createElement("div");
            front.className = "face front";
            front.textContent = clue.value;

            const back = document.createElement("div");
            back.className = "face back";
            back.textContent = "";                    // filled on reveal
            back.title = "Double-click or Shift+Enter to expand";

            card.append(front, back);
            cell.append(card);

            // per-cell data/state
            cell.dataset.state = "hidden";            // hidden -> question -> answer
            cell.dataset.q = clue.question;
            cell.dataset.a = clue.answer;

            // ONE click handler that branches on click-count:
            // detail===1 -> advance state; detail>=2 -> open modal (no more advance)
            cell.addEventListener("click", (e) => {
                if (e.detail >= 2) {
                    e.preventDefault();
                    e.stopPropagation();
                    openClueModal(cell);
                    return;
                }
                onCellClick(e); // single click: value->question or question->answer
            });

            // Keyboard: Enter = advance; Shift+Enter = open full text
            cell.addEventListener("keydown", (e) => {
                if (e.key === "Enter" && e.shiftKey) {
                    e.preventDefault();
                    openClueModal(cell);
                } else if (e.key === "Enter") {
                    onCellClick(e);
                }
            });

            boardEl.appendChild(cell);
        }
    }

    // modal close wiring (idempotent)
    const closeBtn = document.getElementById("closeModal");
    const modal = document.getElementById("clueModal");
    if (closeBtn && modal) {
        closeBtn.onclick = () => modal.close();
    }
}

/** Advance a cell from value to question to answer */
export function advanceCell(cell) {
    const state = cell.dataset.state;
    const card = cell.querySelector(".card");
    const back = cell.querySelector(".back");

    if (state === "hidden") {
        cell.dataset.state = "question";
        cell.classList.remove("answer");
        cell.classList.add("question");
        card.classList.add("flipped");          // flip to show the back
        back.textContent = cell.dataset.q;
    } else if (state === "question") {
        cell.dataset.state = "answer";
        cell.classList.remove("question");
        cell.classList.add("answer");
        back.textContent = cell.dataset.a;      // stay flipped; change back content
    }
}
