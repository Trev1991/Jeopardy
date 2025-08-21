'use strict';

/** Decode HTML entities returned by Open Trivia DB */
function decode(html){
  const el = document.createElement('textarea');
  el.innerHTML = html;
  return el.value;
}

/** Fisher-Yates shuffle */
function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random() * (i+1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const API = {
  /** Fetch categories; returns [{id, name}] */
  async categories(){
    try{
      const res = await fetch('https://opentdb.com/api_category.php');
      const data = await res.json();
      return (data.trivia_categories || []).map(c => ({ id: c.id, name: c.name }));
    }catch(_){ return []; }
  },

  /** Fetch a batch of questions */
  async questions({ amount=10, category='', difficulty='' }){
    const params = new URLSearchParams({ amount: String(amount), type: 'multiple' });
    if (category) params.set('category', String(category));
    if (difficulty) params.set('difficulty', difficulty);
    const url = `https://opentdb.com/api.php?${params.toString()}`;

    const res = await fetch(url, { cache: 'no-store' });
    if(!res.ok) throw new Error('Network error');
    const data = await res.json();
    // response_code 0 = success; 1/2 means no results / invalid
    if (data.response_code !== 0 || !data.results || !data.results.length){
      throw new Error('No questions available with these settings.');
    }
    return data.results.map(q => ({
      category: q.category,
      difficulty: q.difficulty,
      question: decode(q.question),
      correct: decode(q.correct_answer),
      incorrect: q.incorrect_answers.map(decode),
    }));
  }
};

class TriviaGame {
  constructor(root){
    if(!root) throw new Error('Missing #app container');
    // Elements
    this.root = root;
    this.categorySelect = root.querySelector('#categorySelect');
    this.difficultySelect = root.querySelector('#difficultySelect');
    this.amountSelect = root.querySelector('#amountSelect');
    this.startBtn = root.querySelector('#startBtn');

    this.hudIndex = root.querySelector('#qIndex');
    this.hudTotal = root.querySelector('#qTotal');
    this.hudScore = root.querySelector('#score');
    this.hudHigh = root.querySelector('#highScore');

    this.loader = root.querySelector('#loader');
    this.errorBox = root.querySelector('#errorBox');

    this.questionBox = root.querySelector('#questionBox');
    this.choicesEl = root.querySelector('#choices');

    this.submitBtn = root.querySelector('#submitBtn');
    this.nextBtn = root.querySelector('#nextBtn');
    this.resetBtn = root.querySelector('#resetBtn');
    this.statusEl = root.querySelector('#status');

    this.resultsSection = root.querySelector('#results');
    this.resultsSummary = root.querySelector('#resultsSummary');
    this.playAgainBtn = root.querySelector('#playAgainBtn');

    // State
    this.questions = [];
    this.index = 0;
    this.score = 0;
    this.answered = false;

    // Events
    this.startBtn.addEventListener('click', () => this.start());
    this.submitBtn.addEventListener('click', () => this.submit());
    this.nextBtn.addEventListener('click', () => this.next());
    this.resetBtn.addEventListener('click', () => this.reset());
    this.playAgainBtn.addEventListener('click', () => this.reset(true));

    this.choicesEl.addEventListener('change', () => {
      // Enable submit after selection
      this.submitBtn.disabled = !this.getPickedValue();
    });

    // Init
    this.loadHighScore();
    this.populateCategories();
  }

  show(el, on=true){ el.hidden = !on; }

  setLoading(on){
    this.show(this.loader, on);
    this.submitBtn.disabled = on || !this.getPickedValue();
    this.nextBtn.disabled = true;
  }

  setError(msg){
    if(msg){
      this.errorBox.textContent = msg;
      this.show(this.errorBox, true);
    }else{
      this.errorBox.textContent = '';
      this.show(this.errorBox, false);
    }
  }

  loadHighScore(){
    const val = Number(localStorage.getItem('trivia.highscore') || 0);
    this.hudHigh.textContent = String(val);
  }

  saveHighScore(){
    const currentHigh = Number(localStorage.getItem('trivia.highscore') || 0);
    if (this.score > currentHigh){
      localStorage.setItem('trivia.highscore', String(this.score));
      this.hudHigh.textContent = String(this.score);
    }
  }

  async populateCategories(){
    try{
      const cats = await API.categories();
      for(const c of cats){
        const opt = document.createElement('option');
        opt.value = String(c.id);
        opt.textContent = c.name;
        this.categorySelect.appendChild(opt);
      }
    }catch(_){ /* ignore; fallback is Any */ }
  }

  async start(){
    // Reset state
    this.questions = [];
    this.index = 0;
    this.score = 0;
    this.hudScore.textContent = '0';
    this.statusEl.textContent = '';
    this.show(this.resultsSection, false);
    this.setError('');

    // Lock setup controls while loading
    this.startBtn.disabled = true;
    this.categorySelect.disabled = true;
    this.difficultySelect.disabled = true;
    this.amountSelect.disabled = true;

    this.setLoading(true);
    try{
      const amount = Number(this.amountSelect.value || 10);
      const category = this.categorySelect.value;
      const difficulty = this.difficultySelect.value;
      this.questions = await API.questions({ amount, category, difficulty });
      this.hudTotal.textContent = String(this.questions.length);
      this.index = 0;
      this.renderCurrent();
    }catch(err){
      console.error(err);
      this.setError(err.message || 'Failed to load questions.');
    }finally{
      this.setLoading(false);
      // Re-enable setup regardless so user can retry
      this.startBtn.disabled = false;
      this.categorySelect.disabled = false;
      this.difficultySelect.disabled = false;
      this.amountSelect.disabled = false;
    }
  }

  current(){
    return this.questions[this.index];
  }

  renderCurrent(){
    const q = this.current();
    if (!q) return this.finish();

    this.hudIndex.textContent = String(this.index + 1);
    this.statusEl.textContent = '';
    this.submitBtn.disabled = true;
    this.nextBtn.disabled = true;
    this.answered = false;

    // Render question
    this.questionBox.textContent = q.question;

    // Build/shuffle choices
    const choices = shuffle([q.correct, ...q.incorrect]);
    const groupName = `choices-${Date.now()}`;

    this.choicesEl.innerHTML = '';
    choices.forEach((text, idx) => {
      const id = `c-${Date.now()}-${idx}`;
      const label = document.createElement('label');
      label.setAttribute('for', id);
      label.innerHTML = `
        <input type="radio" name="${groupName}" id="${id}" value="${text}">
        <span>${text}</span>
      `;
      this.choicesEl.appendChild(label);
    });

    // Focus first input for accessibility
    const first = this.choicesEl.querySelector('input[type="radio"]');
    if (first) first.focus();
  }

  getPickedValue(){
    const picked = this.choicesEl.querySelector('input[type="radio"]:checked');
    return picked ? picked.value : '';
  }

  submit(){
    if (this.answered) return;
    const q = this.current();
    if (!q) return;
    const picked = this.getPickedValue();
    if (!picked) return;

    this.answered = true;
    const isCorrect = picked === q.correct;

    if (isCorrect){
      this.score += 1;
      this.hudScore.textContent = String(this.score);
      this.statusEl.innerHTML = `<span class="correct">Correct!</span> The answer was: <b>${q.correct}</b>.`;
    } else {
      this.statusEl.innerHTML = `<span class="wrong">Not quite.</span> The answer was: <b>${q.correct}</b>.`;
    }

    // Visual feedback
    this.choicesEl.querySelectorAll('label').forEach(label => {
      const input = label.querySelector('input');
      if (!input) return;
      if (input.value === q.correct){
        label.style.outline = '2px solid var(--ok)';
      }
      input.disabled = true;
    });

    this.submitBtn.disabled = true;
    this.nextBtn.disabled = false;
    this.nextBtn.focus();
  }

  next(){
    if (!this.answered) return;
    this.index += 1;
    if (this.index >= this.questions.length){
      return this.finish();
    }
    this.renderCurrent();
  }

  finish(){
    this.saveHighScore();
    this.resultsSummary.textContent = `You scored ${this.score} out of ${this.questions.length}.`;
    this.show(this.resultsSection, true);
    this.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  reset(andStart=false){
    this.questions = [];
    this.index = 0;
    this.score = 0;
    this.hudScore.textContent = '0';
    this.hudIndex.textContent = '0';
    this.hudTotal.textContent = '0';
    this.questionBox.textContent = '';
    this.choicesEl.innerHTML = '';
    this.statusEl.textContent = '';
    this.submitBtn.disabled = true;
    this.nextBtn.disabled = true;
    this.show(this.resultsSection, false);
    if (andStart) this.start();
  }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
  const app = document.querySelector('#app');
  new TriviaGame(app);
});
