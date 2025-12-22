// DOM ELEMENTS

//oyun tahtası
const board = document.getElementById("gameBoard");

const menuScreen = document.getElementById("menuScreen");
const gameScreen = document.getElementById("gameScreen");

//hamle ve süre
const movesText = document.getElementById("moves");
const timeText = document.getElementById("time");

const difficultySelect = document.getElementById("difficulty");
const timeLimitCheckbox = document.getElementById("timeLimit");
const previewCheckbox = document.getElementById("previewCards");

const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const backBtn = document.getElementById("backBtn");

//skor tablosu
const scoreEasy = document.getElementById("scoreEasy");
const scoreMedium = document.getElementById("scoreMedium");
const scoreHard = document.getElementById("scoreHard");

//OYUN AYARLARI

const maxTime = 60;

//oyunun zorluk ayarını tutar
let gameConfig = { pairs: 12, columns: 6 };

//seçilen zorluk seviyesine göre kart sayılarını ayarlar
function applyDifficulty() {
    const diff = difficultySelect.value;

    if (diff === "easy") {
        gameConfig.pairs = 8;
        gameConfig.columns = 4;
        board.style.maxWidth = "360px";

    } else if (diff === "medium") {
        gameConfig.pairs = 12;
        gameConfig.columns = 6;
        board.style.maxWidth = "520px";

    } else {
        gameConfig.pairs = 16;
        gameConfig.columns = 8;
        board.style.maxWidth = "640px";
    }

    board.style.gridTemplateColumns = `repeat(${gameConfig.columns}, 1fr)`;
}

//API kullanımı

//API'den resimleri alıp localStorage'da saklıyoruz
async function getImages(pairs) {
    const key = `memoryImages_${pairs}`;
    const saved = localStorage.getItem(key);

    if (saved) return JSON.parse(saved);

    try {
        const response = await fetch(`https://picsum.photos/v2/list?limit=${pairs}`);
        const data = await response.json();
        const images = data.map(img => img.download_url);
        localStorage.setItem(key, JSON.stringify(images));
        return images;
    } catch {
        const images = [];
        for (let i = 1; i <= pairs; i++) {
            images.push(`https://picsum.photos/200?random=${i}`);
        }
        localStorage.setItem(key, JSON.stringify(images));
        return images;
    }
}

/* oyun sınıfı */

class MemoryGame {
    constructor(boardElement) {
        this.board = boardElement;
        this.firstCard = null;
        this.secondCard = null;
        this.lockBoard = false;
        this.moves = 0;
        this.time = 0;
        this.timerInterval = null;
        this.matchedPairs = 0;
        this.previewEnabled = false;
    }

    //oyunu başlatır
    start(images, timeLimitEnabled) {
        this.reset();
        this.timeLimitEnabled = timeLimitEnabled;
        this.totalPairs = images.length;
        this.createCards(images);

        // kart ön izleme
        if (this.previewEnabled) {
            const allCards = this.board.querySelectorAll(".card");
            allCards.forEach(card => card.classList.add("flip"));

            setTimeout(() => {
                allCards.forEach(card => card.classList.remove("flip"));
            }, 3000);
        }

        this.startTimer();
    }

    //oyunu sıfırlar
    reset() {
        this.firstCard = null;
        this.secondCard = null;
        this.lockBoard = false;
        this.gameFinished = false;
        this.moves = 0;
        this.time = 0;
        this.matchedPairs = 0;
        movesText.textContent = 0;
        timeText.textContent = 0;
        clearInterval(this.timerInterval);
        this.board.innerHTML = "";
    }

    //kartları oluşturma
    createCards(images) {
        const cards = [...images, ...images].sort(() => Math.random() - 0.5);

        cards.forEach(img => {
            const card = document.createElement("div");
            card.className = "card";
            card.dataset.image = img;

            card.innerHTML = `
                <div class="card-face card-front"></div>
                <div class="card-face card-back" style="background-image:url('${img}')"></div>
            `;

            card.addEventListener("click", () => this.flipCard(card));
            this.board.appendChild(card);
        });
    }

    //kartları çevirme
    flipCard(card) {
        if (this.lockBoard || this.gameFinished || card === this.firstCard || card.classList.contains("flip")) return;


        card.classList.add("flip");

        if (!this.firstCard) {
            this.firstCard = card;
            return;
        }

        this.secondCard = card;
        this.moves++;
        movesText.textContent = this.moves;

        this.checkMatch();
    }

    //kartların eşleşip eşleşmeme kontrolü
    checkMatch() {
        const match = this.firstCard.dataset.image === this.secondCard.dataset.image;

        if (match) {
            this.matchedPairs++;
            this.resetTurn();
            this.checkGameFinished();
        } else {
            this.lockBoard = true;

            setTimeout(() => {
                if (this.firstCard && this.secondCard) {
                    this.firstCard.classList.remove("flip");
                    this.secondCard.classList.remove("flip");
                }
                this.resetTurn();
            }, 1000);
        }
    }

    resetTurn() {
        [this.firstCard, this.secondCard] = [null, null];
        this.lockBoard = false;
    }

    //süreyi başlatma
    startTimer() {
        this.timerInterval = setInterval(() => {
            this.time++;
            timeText.textContent = this.time;

            if (this.timeLimitEnabled && this.time >= maxTime) {
                this.gameOver();
            }
        }, 1000);
    }

    checkGameFinished() {
        if (this.matchedPairs === this.totalPairs) {
            clearInterval(this.timerInterval);
            saveScoreIfBest(this.time, this.moves);
            setTimeout(() => {
                alert(`🎉 Kazandın!\nSüre: ${this.time} sn\nHamle: ${this.moves}`);
            }, 300);
        }
    }

    //süre dolduğunda oyunu bitirir
    gameOver() {
        clearInterval(this.timerInterval);
        this.lockBoard = true;
        this.gameFinished = true; 
        const cards = this.board.querySelectorAll(".card");
        cards.forEach(card => card.classList.remove("flip"));

        setTimeout(() => {
            alert("⏰ Süre doldu! Oyun bitti.");
        }, 200);
    }
}

/* scoreboard*/

//localStorage'dan skorları alıyoruz
function getScores() {
    return JSON.parse(localStorage.getItem("memoryScores")) || {
        easy: null,
        medium: null,
        hard: null
    };
}

//yeni skor eskisinden iyiyse yenisi kaydedikir
function saveScoreIfBest(time, moves) {
    const scores = getScores();
    const diff = difficultySelect.value;

    if (!scores[diff] || time < scores[diff].time) {
        scores[diff] = { time, moves };
        localStorage.setItem("memoryScores", JSON.stringify(scores));
        updateScoreboard();
    }
}

//skorları ekrana yazdırma
function updateScoreboard() {
    const s = getScores();
    scoreEasy.textContent = s.easy ? `Kolay: ⏱ ${s.easy.time}s | 🎯 ${s.easy.moves}` : "Kolay: -";
    scoreMedium.textContent = s.medium ? `Orta: ⏱ ${s.medium.time}s | 🎯 ${s.medium.moves}` : "Orta: -";
    scoreHard.textContent = s.hard ? `Zor: ⏱ ${s.hard.time}s | 🎯 ${s.hard.moves}` : "Zor: -";
}

// OYUNU BAŞLATMA

const game = new MemoryGame(board);

async function startGame() {

    menuScreen.style.display = "none";
    gameScreen.style.display = "block";

    applyDifficulty();
    game.previewEnabled = previewCheckbox.checked;

    const images = await getImages(gameConfig.pairs);

    game.start(images, timeLimitCheckbox.checked);
}

backBtn.addEventListener("click", () => {
    game.reset();
    gameScreen.style.display = "none";
    menuScreen.style.display = "block";
});

restartBtn.addEventListener("click", startGame);
startBtn.addEventListener("click", startGame);

updateScoreboard();
