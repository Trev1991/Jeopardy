// App bootstrap
import { initBoard, registerGlobalEvents } from "./controller.js";

registerGlobalEvents();
initBoard().catch((err) => {
    console.error(err);
    document.getElementById("board").textContent = "Failed to load questions.";
});
