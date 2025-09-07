// Uses The Trivia API (HTTPS) to avoid 429 issues from other providers
// Docs: https://the-trivia-api.com/ (v2 /questions)
import { CLUES_PER_CATEGORY } from "./state.js";

// map difficulty -> Jeopardy-ish "value"
const valueFor = (d) => (d === "easy" ? 200 : d === "medium" ? 400 : 600);

/**
 * Fetch a mixed pool in one request.
 * Accepts axiosOpts.signal so we can abort old loads.
 */
export async function fetchMixedCluePool(limit = 80, axiosOpts = {}) {
    const { data } = await axios.get("https://the-trivia-api.com/v2/questions", {
        params: { limit },        // 80 = plenty to build 6×5
        ...axiosOpts              // e.g. { signal }
    });

    const arr = Array.isArray(data) ? data : [];
    return arr
        .filter((q) => q?.question?.text && q?.correctAnswer && q?.category)
        .map((q) => ({
            category: typeof q.category === "string" ? q.category : String(q.category),
            question: q.question.text,
            answer: q.correctAnswer,
            value: valueFor(q.difficulty ?? "medium")
        }));
}

/**
 * Group by category and pick the first N categories with enough clues.
 */
export function buildCategoriesFromPool(pool, numCategories, cluesPerCategory = CLUES_PER_CATEGORY) {
    const byCat = new Map();

    for (const clue of pool) {
        if (!byCat.has(clue.category)) byCat.set(clue.category, []);
        const list = byCat.get(clue.category);
        if (list.length < cluesPerCategory) {
            list.push({ question: clue.question, answer: clue.answer, value: clue.value });
        }
    }

    const full = [...byCat.entries()].filter(([, list]) => list.length === cluesPerCategory);
    const ordered = full.length ? full : [...byCat.entries()].sort((a, b) => b[1].length - a[1].length);

    const built = [];
    for (const [title, clues] of ordered) {
        if (clues.length < cluesPerCategory) break;
        built.push({ id: title, title, clues });
        if (built.length === numCategories) break;
    }
    return built;
}
