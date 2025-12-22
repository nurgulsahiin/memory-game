// DOM ELEMENTS

//oyun tahtası
const board = document.getElementById("gameBoard");

//hamle ve süre
const movesText = document.getElementById("moves");
const timeText = document.getElementById("time");

const difficultySelect = document.getElementById("difficulty");
const timeLimitCheckbox = document.getElementById("timeLimit");
const startBtn = document.getElementById("startBtn");
const themeToggle = document.getElementById("themeToggle");

//skor tablosu
const scoreEasy = document.getElementById("scoreEasy");
const scoreMedium = document.getElementById("scoreMedium");
const scoreHard = document.getElementById("scoreHard");

//OYUN AYARLARI

const maxTime = 60;

//oyunun zorluk ayarını tutar
let gameConfig = {
    pairs: 12,
    columns: 6,
    timeLimit: false
};

//seçilen zorluk seviyesine göre kart sayılarını ayarlar
function applyDifficulty() {
    const diff = difficultySelect.value;

    if (diff === "easy") {
        gameConfig.pairs = 8;
        gameConfig.columns = 4;
    } else if (diff === "medium") {
        gameConfig.pairs = 12;
        gameConfig.columns = 6;
    } else {
        gameConfig.pairs = 16;
        gameConfig.columns = 8;
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
    }

    //oyunu başlatır
    start(images, timeLimitEnabled) {
        this.reset();
        this.timeLimitEnabled = timeLimitEnabled;
        this.totalPairs = images.length;
        this.createCards(images);
        this.startTimer();
    }

    //oyunu sıfırlar
    reset() {
        this.firstCard = null;
        this.secondCard = null;
        this.lockBoard = false;
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
        if (this.lockBoard || card === this.firstCard || card.classList.contains("flip")) return;

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
                this.firstCard.classList.remove("flip");
                this.secondCard.classList.remove("flip");
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

        // tüm kartları kapat
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
        localStorage.setItem("memoryScores", JSON.stringify(scores)); //localStorage'a kaydediyoruz
        updateScoreboard();//ekranı güncelle
    }
}

//skorları ekrana yazdırma
function updateScoreboard() {

    const s = getScores();
    scoreEasy.textContent = s.easy ? `Kolay: ⏱ ${s.easy.time}s | 🎯 ${s.easy.moves}` : "Kolay: -";
    scoreMedium.textContent = s.medium ? `Orta: ⏱ ${s.medium.time}s | 🎯 ${s.medium.moves}` : "Orta: -";
    scoreHard.textContent = s.hard ? `Zor: ⏱ ${s.hard.time}s | 🎯 ${s.hard.moves}` : "Zor: -";
}

//tema
function loadTheme() {
    const theme = localStorage.getItem("theme");
    if (theme === "dark") {
        document.body.classList.add("dark");
        themeToggle.checked = true;
    }
}

function toggleTheme() {
    if (themeToggle.checked) {
        document.body.classList.add("dark");
        localStorage.setItem("theme", "dark");
    } else {
        document.body.classList.remove("dark");
        localStorage.setItem("theme", "light");
    }
}

themeToggle.addEventListener("change", toggleTheme);
loadTheme();

// OYUNU BAŞLATMA

//memory sınıfından bir oyun oluşturuyoruz
const game = new MemoryGame(board);

//başlat butonuna basılınca çalışır
async function startGame() {

    applyDifficulty(); // zorluk ayarını uygula
    gameConfig.timeLimit = timeLimitCheckbox.checked; //süre limiti açık mı kontrol

    const images = await getImages(gameConfig.pairs); //API'den görselleri al

    game.start(images, gameConfig.timeLimit); //oyunu başlat
}

startBtn.addEventListener("click", startGame);

updateScoreboard();
