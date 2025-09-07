// App constants
export const NUM_CATEGORIES = 6;
export const CLUES_PER_CATEGORY = 5;

// DOM refs
export const boardEl = document.getElementById("board");
export const restartBtn = document.getElementById("restartBtn");

// In-memory state
export let categories = []; // [{ id, title, clues: [{ question, answer, value }] }]

export function setCategories(next) {
    categories = next;
}
