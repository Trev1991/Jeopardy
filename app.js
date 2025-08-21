const categories = [
    { name: 'Category 1', questions: ['Question 1', 'Question 2', 'Question 3'] },
    { name: 'Category 2', questions: ['Question 1', 'Question 2', 'Question 3'] },
    // Add more categories and questions as needed
];

const gameBoard = document.getElementById('game-board');

// Create the game board
function createGameBoard() {
    for (const category of categories) {
        const categoryElement = document.createElement('div');
        categoryElement.classList.add('category');

        const categoryName = document.createElement('div');
        categoryName.classList.add('category-name');
        categoryName.textContent = category.name;
        categoryElement.appendChild(categoryName);

        for (const question of category.questions) {
            const questionElement = document.createElement('div');
            questionElement.classList.add('question');
            questionElement.textContent = question;
            questionElement.addEventListener('click', () => showQuestion(category.name, question));
            categoryElement.appendChild(questionElement);
        }

        gameBoard.appendChild(categoryElement);
    }
}

// Show question when clicked
function showQuestion(categoryName, question) {
    // Implement question display and answer handling
}

// Call the function to create the game board
createGameBoard();