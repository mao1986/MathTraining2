// 全局变量
let currentQuestion = '';
let correctAnswer = 0;
let questionCount = 0;
let correctCount = 0;
let wrongQuestions = [];
let totalQuestions = 0;
let score = 0;
let highestScore = parseInt(localStorage.getItem('highestScore')) || 0;
let practiceMode = '';
let currentPracticeType = '';
let isPaused = false;
let timerInterval = null;
let progressInterval = null;
let startTime = 0;
let timeLimit = 0;
let questionSet = new Set();
let allWrongQuestions = JSON.parse(localStorage.getItem('allWrongQuestions')) || [];
let customQuestions = [];
let currentCustomIndex = 0;

// 显示对应的设置区域
function showSection(section) {
    document.getElementById('settingsContainer').style.display = 'none';
    document.getElementById('customQuestionsContainer').style.display = 'none';
    document.getElementById('mistakeListContainer').style.display = 'none';
    document.getElementById('resultContainer').style.display = 'none';
    document.getElementById('practiceContainer').style.display = 'none';

    if (section === 'settings') {
        document.getElementById('settingsContainer').style.display = 'block';
    } else if (section === 'custom') {
        document.getElementById('customQuestionsContainer').style.display = 'block';
    }
}

// 清空【全部错题】里的错题
function clearAllWrongQuestions() {
    allWrongQuestions = [];
    localStorage.setItem('allWrongQuestions', JSON.stringify(allWrongQuestions));
    showMistakeList();
    alert('已清空全部错题！');
}

// 开始练习
function startPractice(mode) {
    // 清理上一次的练习
    clearTimers();
    resetVariables();

    practiceMode = mode;

    if (mode === 'regular') {
        currentPracticeType = document.getElementById('practiceType').value;
        timeLimit = parseInt(document.getElementById('difficulty').value) * 1000;
        questionCount = parseInt(document.getElementById('numQuestions').value);
        totalQuestions = questionCount;
    } else if (mode === 'custom') {
        const customQuestionsText = document.getElementById('customQuestions').value.trim();
        if (!customQuestionsText) {
            alert('请输入自定义题目！');
            return;
        }
        timeLimit = parseInt(document.getElementById('customDifficulty').value) * 1000;
        customQuestions = parseCustomQuestions(customQuestionsText);
        if (customQuestions.length === 0) {
            alert('自定义题目格式有误！');
            return;
        }
        totalQuestions = customQuestions.length;
        questionCount = totalQuestions;
    } else if (mode === 'wrong') {
        timeLimit = 5000; // 默认5秒
        currentPracticeType = null;
        questionCount = allWrongQuestions.length;
        totalQuestions = questionCount;
        if (questionCount === 0) {
            alert('没有错题可练习！');
            return;
        }
    }

    document.getElementById('settingsContainer').style.display = 'none';
    document.getElementById('customQuestionsContainer').style.display = 'none';
    document.getElementById('mistakeListContainer').style.display = 'none';
    document.getElementById('resultContainer').innerHTML = '';
    document.getElementById('practiceContainer').style.display = 'block';

    nextQuestion();
}

// 解析自定义题目
function parseCustomQuestions(text) {
    const lines = text.split('\n');
    const questions = [];
    lines.forEach(line => {
        line = line.trim();
        if (line.endsWith('=')) {
            line = line.slice(0, -1).trim();
        }
        const operator = line.includes('+') ? '+' : line.includes('-') ? '-' : null;
        if (!operator) return;
        const [aStr, bStr] = line.split(operator).map(s => s.trim());
        const a = parseInt(aStr);
        const b = parseInt(bStr);
        if (isNaN(a) || isNaN(b)) return;
        let answer;
        if (operator === '+') {
            answer = a + b;
        } else if (operator === '-') {
            answer = a - b;
        }
        questions.push({ question: `${a} ${operator} ${b} =`, answer });
    });
    return questions;
}

// 获取下一道题目
function nextQuestion() {
    clearTimers();

    if (questionCount <= 0) {
        endPractice();
        return;
    }

    if (practiceMode === 'regular') {
        const questionObj = generateQuestion(currentPracticeType);
        currentQuestion = questionObj.question;
        correctAnswer = questionObj.answer;
    } else if (practiceMode === 'custom') {
        const current = customQuestions[currentCustomIndex++];
        currentQuestion = current.question;
        correctAnswer = current.answer;
    } else if (practiceMode === 'wrong') {
        const randomIndex = Math.floor(Math.random() * allWrongQuestions.length);
        const wrongQuestion = allWrongQuestions[randomIndex];
        currentQuestion = wrongQuestion.question;
        correctAnswer = wrongQuestion.answer;
    }

    questionCount--;
    updateDisplay();
    startTime = Date.now();
    startTimer();
    startProgressBar();
}

// 生成题目
function generateQuestion(type) {
    let a, b, question, answer;
    let maxAttempts = 100;
    while (maxAttempts > 0) {
        switch (parseInt(type)) {
            case 1:
                a = getRandomInt(1, 9);
                b = getRandomInt(1, 9);
                if (a + b >= 11 && a + b !== 10 && !questionSet.has(`${a} + ${b}`)) {
                    question = `${a} + ${b} =`;
                    answer = a + b;
                    questionSet.add(`${a} + ${b}`);
                    return { question, answer };
                }
                break;
            case 2:
                a = getRandomInt(11, 19);
                b = getRandomInt(1, 9);
                if (a - b < 10 && a - b !== 10 && !questionSet.has(`${a} - ${b}`)) {
                    question = `${a} - ${b} =`;
                    answer = a - b;
                    questionSet.add(`${a} - ${b}`);
                    return { question, answer };
                }
                break;
            case 3:
                if (Math.random() < 0.5) {
                    type = 1;
                } else {
                    type = 2;
                }
                continue;
        }
        maxAttempts--;
    }
    return { question: '暂无题目', answer: 0 };
}

// 更新显示
function updateDisplay() {
    document.getElementById('questionDisplay').textContent = currentQuestion;
    document.getElementById('answer').value = '';
    document.getElementById('answer').focus();
    document.getElementById('remaining').textContent = `剩余题目：${totalQuestions - questionCount} / ${totalQuestions}`;
}

// 开始计时器
function startTimer() {
    const timerDisplay = document.getElementById('timer');
    timerInterval = setInterval(() => {
        if (!isPaused) {
            const elapsed = Date.now() - startTime;
            const remainingTime = Math.max(0, Math.ceil((timeLimit - elapsed) / 1000));
            timerDisplay.textContent = `剩余时间：${remainingTime}秒`;
            if (remainingTime <= 0) {
                submitAnswer();
            }
        }
    }, 100);
}

// 开始进度条
function startProgressBar() {
    const progressBar = document.getElementById('progress');
    progressBar.style.width = '100%';
    const totalWidth = 100;
    const decrement = totalWidth / (timeLimit / 100);
    let width = totalWidth;
    progressInterval = setInterval(() => {
        if (!isPaused) {
            width -= decrement;
            if (width <= 0) {
                width = 0;
                clearInterval(progressInterval);
            }
            progressBar.style.width = `${width}%`;
        }
    }, 100);
}

// 提交答案
const answerInput = document.getElementById('answer');
answerInput.addEventListener('keyup', function(event) {
    if (event.key === 'Enter' || event.key === ' ') {
        submitAnswer();
    }
});

answerInput.addEventListener('keydown', function(event) {
    if (event.key === ' ') {
        event.preventDefault(); // 阻止空格输入到输入框中
    }
});

function submitAnswer() {
    clearTimers();
    const userAnswer = parseInt(document.getElementById('answer').value);
    const responseTime = (Date.now() - startTime) / 1000;
    let points;
    if (responseTime <= 1) {
        points = 10;
    } else if (responseTime <= 2) {
        points = 8;
    } else if (responseTime <= 3) {
        points = 7;
    } else if (responseTime <= 4) {
        points = 6;
    } else {
        points = 5;
    }

    if (userAnswer === correctAnswer) {
        correctCount++;
        score += points;
    } else {
        wrongQuestions.push({ question: currentQuestion, answer: correctAnswer });
        if (!allWrongQuestions.some(q => q.question === currentQuestion)) {
            allWrongQuestions.push({ question: currentQuestion, answer: correctAnswer });
            localStorage.setItem('allWrongQuestions', JSON.stringify(allWrongQuestions));
        }
    }

    nextQuestion();
}

// 结束练习
function endPractice() {
    clearTimers();
    document.getElementById('practiceContainer').style.display = 'none';
    document.getElementById('resultContainer').style.display = 'block';

    const accuracy = (correctCount / totalQuestions) * 100;

    if (score > highestScore) {
        highestScore = score;
        localStorage.setItem('highestScore', highestScore);
    }

    document.getElementById('resultContainer').innerHTML = `
        <h2>练习结束</h2>
        <p style="font-size: 32px;">总积分: ${score}</p>
        <p style="font-size: 24px;">最高记录: ${highestScore}</p>
        <p style="font-size: 24px;">正确率: ${accuracy.toFixed(2)}%</p>
    `;

    if (wrongQuestions.length > 0) {
        let wrongQuestionsHtml = '<h3>本次练习错误的题目:</h3><ul>';
        wrongQuestions.forEach(q => {
            wrongQuestionsHtml += `<li>${q.question.replace('= ?', '=')}</li>`;
        });
        wrongQuestionsHtml += '</ul>';
        document.getElementById('resultContainer').innerHTML += wrongQuestionsHtml;
    } else {
        document.getElementById('resultContainer').innerHTML += '<p>本次练习全对，做得不错！</p>';
    }
}

// 重新开始练习
function restartPractice() {
    clearTimers();
    resetVariables();
    if (practiceMode === 'custom') {
        currentCustomIndex = 0;
        questionCount = totalQuestions;
    } else {
        questionCount = totalQuestions;
    }
    nextQuestion();
}

// 退出练习
function exitPractice() {
    clearTimers();
    resetVariables();
    document.getElementById('practiceContainer').style.display = 'none';
    document.getElementById('resultContainer').innerHTML = '';
    showSection('settings');
}

// 显示错题清单
function showMistakeList() {
    clearTimers();
    resetVariables();
    document.getElementById('settingsContainer').style.display = 'none';
    document.getElementById('customQuestionsContainer').style.display = 'none';
    document.getElementById('practiceContainer').style.display = 'none';
    document.getElementById('resultContainer').innerHTML = '';
    document.getElementById('mistakeListContainer').style.display = 'block';

    const types = [
        { type: '1', name: '进位加法' },
        { type: '2', name: '退位减法' },
        { type: '3', name: '加减随机' },
        { type: 'all', name: '全部错题' }
    ];

    let containerHtml = '';
    types.forEach(t => {
        let filteredMistakes = t.type === 'all' ? allWrongQuestions : allWrongQuestions.filter(q => q.type == t.type);
        containerHtml += `<div class="mistake-column">
            <h3>${t.name}</h3>`;
        if (filteredMistakes.length === 0) {
            containerHtml += '<p>没有错题。</p>';
        } else {
            containerHtml += '<ul>';
            filteredMistakes.forEach(q => {
                containerHtml += `<li>${q.question.replace('= ?', '=')}</li>`;
            });
            containerHtml += '</ul>';
            containerHtml += `<button onclick="startMistakePractice('${t.type}')">开始错题练习</button>`;
            if (t.type !== 'all') {
                containerHtml += `<button onclick="clearWrongQuestions('${t.type}')">清空错题</button>`;
            }
        }
        containerHtml += '</div>';
    });
    document.getElementById('mistakeListContainer').innerHTML = containerHtml;
}

// 开始错题练习
function startMistakePractice(type) {
    clearTimers();
    resetVariables();
    practiceMode = 'wrong';
    if (type !== 'all') {
        allWrongQuestions = allWrongQuestions.filter(q => q.type == type);
    }
    questionCount = allWrongQuestions.length;
    totalQuestions = questionCount;
    if (questionCount === 0) {
        alert('没有错题可练习！');
        return;
    }
    document.getElementById('mistakeListContainer').style.display = 'none';
    document.getElementById('practiceContainer').style.display = 'block';
    nextQuestion();
}

// 清空错题
function clearWrongQuestions(type) {
    if (type === 'all') {
        allWrongQuestions = [];
    } else {
        allWrongQuestions = allWrongQuestions.filter(q => q.type != type);
    }
    localStorage.setItem('allWrongQuestions', JSON.stringify(allWrongQuestions));
    showMistakeList();
    alert('已清空该类型的错题！');
}

// 暂停/恢复练习
function togglePause() {
    if (!isPaused) {
        isPaused = true;
        document.getElementById('pauseButton').textContent = '恢复';
    } else {
        isPaused = false;
        startTime += Date.now() - (startTime + timeLimit - Date.now());
        document.getElementById('pauseButton').textContent = '暂停';
    }
}

// 清除计时器
function clearTimers() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
}

// 重置变量
function resetVariables() {
    currentQuestion = '';
    correctAnswer = 0;
    questionCount = 0;
    correctCount = 0;
    wrongQuestions = [];
    totalQuestions = 0;
    score = 0;
    isPaused = false;
    startTime = 0;
    timeLimit = 0;
    questionSet.clear();
    customQuestions = [];
    currentCustomIndex = 0;
}

// 获取随机整数
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 初始化
showSection('settings');
