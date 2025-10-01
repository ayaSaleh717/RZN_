// تعريف المتغيرات العالمية للتعرف على الكلام
let recognition;
let isListening = false;
let selectedLang = localStorage.getItem('selectedLang') || 'ar-SA';
let conversationStep = 0;
let userPreferences = {};
let openaiApiKey = localStorage.getItem('openaiApiKey') || '';

// --- Dark mode toggle (minimal) ---
let currentTheme = localStorage.getItem('theme') || 'light';

function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'dark') {
        root.setAttribute('data-theme', 'dark');
    } else {
        root.removeAttribute('data-theme');
    }
    currentTheme = theme;
    localStorage.setItem('theme', theme);
    updateThemeToggleButton();
}

function updateThemeToggleButton() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    const dark = currentTheme === 'dark';
    btn.textContent = dark ? '☀️' : '🌙';
    btn.setAttribute('aria-label', dark ? 'Light theme' : 'Dark theme');
}

function initTheme() {
    // Force default to light on every load
    currentTheme = 'light';
    applyTheme('light');
}

// إضافة متغيرات جديدة للتحكم بالصوت
let speechSynthesis = window.speechSynthesis;
let currentUtterance = null;
let isSpeaking = false;
// إعدادات الصوت المحسنة للذكاء الاصطناعي
let autoSpeakEnabled = localStorage.getItem('autoSpeakEnabled') === 'true' || true;
let speechRate = parseFloat(localStorage.getItem('speechRate')) || 0.9; // أبطأ قليلاً
let speechPitch = parseFloat(localStorage.getItem('speechPitch')) || 1.1; // نغمة أعلى
let speechVolume = parseFloat(localStorage.getItem('speechVolume')) || 1.0;
// إدارة الأصوات (TTS)
let availableVoices = [];
let selectedVoiceURI = localStorage.getItem('selectedVoiceURI') || '';

// PWA المتغيرات
let deferredPrompt;
let isOnline = navigator.onLine;

// Navigation history for floating content
let navigationHistory = [];
let currentContent = 'main-page';

// قائمة الأسئلة المعدلة للمحادثة
const conversationQuestions = [
    "فيه أكل ما تحبه أبداً او ما تأكله؟",
    "ايش تحب اكثر الحلويات (زي الكيك والشوكولا) ولا الموالح (زي البطاطس والشوربة)؟",
    "تحب وجباتك تكون صغيرة وخفيفة ولا وجبة كبيرة تشبعك؟",
    "ايش تفضل اكثر أكل البيت ولا اكل المطاعم؟",
    "ها تفطر الصبح قبل المدرسة ؟",
    "كم مره تأكل باليوم تقريباً؟",
    "تحب تاكل سناك بين الوجبات (زيّ فواكه، بسكوت، عصير) ؟",
    "تشرب موية كثير باليوم ولا شوي؟",
    "الساعه كم تتعشى؟",
    "هل تلعب رياضة ؟ إذا ايوا وش اللعبة اللي تحبها؟ ⚽🏀",
    "هل تتحرك كثير في يومك ولا تجلس أكثر؟",
    "تنام بدري ولا متأخر؟",
    "تحب يكون أكلك يساعدك تصير: أقوى 💪 – أنشط 🏃 – ولا تحافظ على وزنك وصحتك"
];

// قاعدة بيانات للوجبات الغذائية مع كميات محددة
const mealsDatabase = {
    breakfast: [
        { quantity: "فطور", description: "نصف كوب شوفان مع حليب قليل الدسم وملعقة عسل وموزة" },
        { quantity: "فطور", description: "2 بيضة مسلوقة مع شريحة خبز توست وجبنة قليلة الدسم" },
        { quantity: "فطور", description: "نصف حبة أفوكادو مع بيض مسلوق وشريحة خبز أسمر" },
        { quantity: "فطور", description: "كوب كورن فليكس مع حليب قليل الدسم وفراولة طازجة" },
        { quantity: "فطور", description: "2 فطيرة شوفان مع عسل وموز وجوز" }
    ],
    snack1: [
        { quantity: "وجبة خفيفة", description: "حبة تفاح مع ملعقة زبدة فول سوداني" },
        { quantity: "وجبة خفيفة", description: "حفنة مكسرات من المكسرات غير المملحة" },
        { quantity: "وجبة خفيفة", description: "كوب زبادي مع جرانولا وتوت طازج" },
        { quantity: "وجبة خفيفة", description: "حبة موز مغذية وسريعة" },
        { quantity: "وجبة خفيفة", description: "حفنة من التمر طبيعية وغنية بالطاقة" }
    ],
    lunch: [
        { quantity: "غداء", description: "صدر دجاج مشوي مع أرز بني وسلطة خضراء" },
        { quantity: "غداء", description: "سمك مشوي مع بطاطا حلوة وخضار سوتيه" },
        { quantity: "غداء", description: "صحن معكرونة قمح كامل مع صلصة طماطم وبروتين" },
        { quantity: "غداء", description: "صحن شوربة عدس مع خبز أسمر وسلطة" },
        { quantity: "غداء", description: "سلطة كينوا مع خضار مشوية وقطعة تونة" }
    ],
    snack2: [
        { quantity: "وجبة خفيفة", description: "كوب جزر صغير مع حمص" },
        { quantity: "وجبة خفيفة", description: "حبة برتقال منعشة" },
        { quantity: "وجبة خفيفة", description: "كوب حليب قليل الدسم مع تمر" },
        { quantity: "وجبة خفيفة", description: "حفنة من الفشار غير المملح" },
        { quantity: "وجبة خفيفة", description: "سموذي أخضر مع سبانخ وموز" }
    ],
    dinner: [
        { quantity: "عشاء", description: "سلطة دجاج مع خضار طازجة وزيت زيتون" },
        { quantity: "عشاء", description: "شوربة خضار مع قطعة خبز أسمر" },
        { quantity: "عشاء", description: "بيض مسلوق مع خضار سوتيه" },
        { quantity: "عشاء", description: "سلمون مشوي مع بروكلي وقرنبيط" },
        { quantity: "عشاء", description: "سلطة تونة مع خضار وفواكه" }
    ]
};

// رسائل مخصصة بناءً على التفضيلات
const personalizedMessages = [
    "بناءً على تفضيلاتك، جهزت لك خطة غذائية متوازنة تناسب ذوقك 🍎",
    "خططتك الغذائية جاهزة! ركزت فيها على الأكلات اللي تحبها 💪",
    "هاهي خطتك الأسبوعية! حطيت فيها أكلك المفضل عشان تستمتع بيها 😋",
    "بناءً على إجاباتك، هذه الخطة الغذائية رح تساعدك توصل لأهدافك 🎯",
    "جهزت لك نظام غذائي حلو ومتنوع، وركزت على النقاط اللي ذكرتها 🌟"
];

// وظيفة تحويل النص إلى كلام - تم إصلاحها
// وظيفة تحويل النص إلى كلام بتأثيرات ذكية
function speakText(text) {
    // إيقاف أي كلام جاري
    stopSpeaking();

    if (!speechSynthesis) {
        console.error('Text-to-Speech غير مدعوم في هذا المتصفح');
        showNotification('عذراً، خاصية النطق غير مدعومة في متصفحك. يرجى استخدام Chrome أو Edge.');
        return;
    }

    // التحقق من أن النص غير فارغ
    if (!text || text.trim() === '') {
        console.error('النص فارغ لا يمكن نطقه');
        return;
    }

    // معالجة النص لجعله أكثر طبيعية (إزالة الرموز التعبيرة وتحسين النطق)
    const processedText = preprocessTextForSpeech(text);

    // إنشاء نص للنطق
    currentUtterance = new SpeechSynthesisUtterance(processedText);
    currentUtterance.lang = selectedLang;
    
    // إعدادات صوت الذكاء الاصطناعي المحسنة
    currentUtterance.rate = 0.9; // أبطأ قليلاً ليكون أكثر وضوحاً
    currentUtterance.pitch = 1.1; // نغمة أعلى قليلاً
    currentUtterance.volume = speechVolume;

    // اختيار أفضل صوت للغة العربية
    try {
        if (!availableVoices || availableVoices.length === 0) {
            availableVoices = speechSynthesis.getVoices();
        }
        
        // البحث عن صوت عربي ذكي
        const aiVoice = findAIVoice(availableVoices);
        if (aiVoice) {
            currentUtterance.voice = aiVoice;
        }
    } catch (error) {
        console.warn('تعذر تحميل الأصوات المخصصة:', error);
    }

    // أحداث النطق
    currentUtterance.onstart = function() {
        isSpeaking = true;
        document.getElementById('tts-btn').classList.add('active');
        document.getElementById('speech-status').textContent = "رِزْن يتحدث...";
        document.getElementById('speech-status').classList.add("listening");
        
        // إضافة تأثير بصري أثناء الكلام
        document.querySelectorAll('.bot-message').forEach(msg => {
            msg.classList.add('speaking');
        });
    };

    currentUtterance.onend = function() {
        isSpeaking = false;
        document.getElementById('tts-btn').classList.remove('active');
        document.getElementById('speech-status').textContent = "تم النطق";
        document.getElementById('speech-status').classList.remove("listening");
        
        // إزالة التأثير البصري
        document.querySelectorAll('.bot-message').forEach(msg => {
            msg.classList.remove('speaking');
        });
    };

    currentUtterance.onerror = function(event) {
        console.error('خطأ في النطق:', event.error);
        isSpeaking = false;
        document.getElementById('tts-btn').classList.remove('active');
        document.getElementById('speech-status').textContent = "حدث خطأ في النطق";
        document.getElementById('speech-status').classList.remove("listening");
        showNotification('حدث خطأ في النطق. يرجى المحاولة مرة أخرى.');
    };

    // إضافة وقفات طبيعية بين الجمل
    currentUtterance.onboundary = function(event) {
        // يمكن إضافة تأثيرات إضافية هنا أثناء الكلام
    };

    // بدء النطق
    speechSynthesis.speak(currentUtterance);
}



// دالة معالجة النص لجعله أكثر ملاءمة للذكاء الاصطناعي
function preprocessTextForSpeech(text) {
    let processed = text
        .replace(/[🤖🧠💡⚡🎯✨🌟💪🍎🥗🏃‍♀️🚶‍♀️🛌💧]/g, '') // إزالة الرموز التعبيرة
        .replace(/\n/g, '. ') // تحويل الأسطر الجديدة إلى نقاط توقف
        .replace(/\.{2,}/g, '.') // إزالة النقاط المتكررة
        .replace(/\s+/g, ' ') // إزالة المسافات الزائدة
        .trim();

    // إضافة تنغيم طبيعي للجمل الاستفهامية والتعجبية
    processed = processed
        .replace(/\؟/g, '?')
        .replace(/\!/g, '!')
        .replace(/([.!?])\s*/g, '$1 '); // إضافة مسافات بعد علامات الترقيم

    return processed;
}

// دالة للعثور على أفضل صوت للذكاء الاصطناعي
function findAIVoice(voices) {
    // أولوية: البحث عن أصوات عربية حديثة
    const arabicVoices = voices.filter(voice => 
        voice.lang.startsWith('ar') || 
        voice.lang.includes('ar') ||
        voice.name.toLowerCase().includes('arabic') ||
        voice.name.toLowerCase().includes('zira') ||
        voice.name.toLowerCase().includes('david')
    );

    if (arabicVoices.length > 0) {
        // تفضيل الأصوات ذات الجودة الأعلى
        return arabicVoices.reduce((best, current) => {
            // إعطاء أولوية للأصوات التي تحتوي على كلمات مفتاحية معينة
            const bestScore = getVoiceScore(best);
            const currentScore = getVoiceScore(current);
            return currentScore > bestScore ? current : best;
        });
    }

    // إذا لم توجد أصوات عربية، استخدم الصوت الافتراضي
    return voices.find(voice => voice.default) || voices[0];
}

// دالة لتقييم جودة الصوت
function getVoiceScore(voice) {
    let score = 0;
    
    // كلمات مفتاحية تشير إلى جودة عالية
    const qualityKeywords = [
        'google', 'microsoft', 'natural', 'premium', 'enhanced',
        'online', 'cloud', 'neural', 'wavenet'
    ];
    
    qualityKeywords.forEach(keyword => {
        if (voice.name.toLowerCase().includes(keyword)) {
            score += 10;
        }
    });
    
    // تفضيل الأصوات العربية المحددة
    if (voice.lang.startsWith('ar')) score += 20;
    if (voice.default) score += 5;
    
    return score;
}

// دالة محسنة للعثور على أفضل صوت للغة
function findBestVoiceForLang(lang, voices) {
    const langPrefix = lang.split('-')[0].toLowerCase();
    
    // البحث عن صوت مطابق تماماً للغة
    let exactMatch = voices.find(voice => 
        voice.lang.toLowerCase() === lang.toLowerCase()
    );
    if (exactMatch) return exactMatch;
    
    // البحث عن صوت يطابق بادئة اللغة
    let prefixMatch = voices.find(voice => 
        voice.lang.toLowerCase().startsWith(langPrefix)
    );
    if (prefixMatch) return prefixMatch;
    
    // استخدام الصوت الافتراضي
    return voices.find(voice => voice.default) || voices[0];
}

// إيقاف النطق
function stopSpeaking() {
    if (speechSynthesis && isSpeaking) {
        speechSynthesis.cancel();
        isSpeaking = false;
        document.getElementById('tts-btn').classList.remove('active');
        document.getElementById('speech-status').textContent = "تم إيقاف النطق";
        document.getElementById('speech-status').classList.remove("listening");
    }
}

// تبديل النطق (تشغيل/إيقاف)
function toggleSpeaking() {
    if (isSpeaking) {
        stopSpeaking();
    } else {
        // إذا كان هناك نص في حقل النص، انطقه
        const speechText = document.getElementById('speech-text').textContent;
        if (speechText && speechText !== 'النص المعترف به سيظهر هنا...') {
            speakText(speechText);
        } else {
            showNotification('لا يوجد نص للنطق');
        }
    }
}

// تكرار السؤال الحالي
function repeatQuestion() {
    if (conversationStep > 0 && conversationStep <= conversationQuestions.length) {
        const currentQuestion = conversationQuestions[conversationStep - 1];
        speakText(currentQuestion);
    } else {
        showNotification('لا يوجد سؤال حالياً لتكراره');
    }
}

// تحديث إعدادات الصوت
function updateSpeechSettings() {
    speechRate = parseFloat(document.getElementById('speech-rate').value);
    speechPitch = parseFloat(document.getElementById('speech-pitch').value);
    speechVolume = parseFloat(document.getElementById('speech-volume').value);
    autoSpeakEnabled = document.getElementById('auto-speak').checked;

    // حفظ الإعدادات
    localStorage.setItem('speechRate', speechRate);
    localStorage.setItem('speechPitch', speechPitch);
    localStorage.setItem('speechVolume', speechVolume);
    localStorage.setItem('autoSpeakEnabled', autoSpeakEnabled);

    // تحديث قيم العرض
    document.getElementById('rate-value').textContent = speechRate.toFixed(1);
    document.getElementById('pitch-value').textContent = speechPitch.toFixed(1);
    document.getElementById('volume-value').textContent = (speechVolume * 100).toFixed(0) + '%';

    showNotification('تم حفظ إعدادات الصوت');
}

// تحميل إعدادات الصوت المحفوظة
function loadSpeechSettings() {
    document.getElementById('speech-rate').value = speechRate;
    document.getElementById('speech-pitch').value = speechPitch;
    document.getElementById('speech-volume').value = speechVolume;
    document.getElementById('auto-speak').checked = autoSpeakEnabled;

    // تحديث قيم العرض
    document.getElementById('rate-value').textContent = speechRate.toFixed(1);
    document.getElementById('pitch-value').textContent = speechPitch.toFixed(1);
    document.getElementById('volume-value').textContent = (speechVolume * 100).toFixed(0) + '%';
}

// وظائف الذكاء الاصطناعي
async function getAIResponse(userMessage) {
    const chatContainer = document.getElementById('ai-chat-container');
    const thinkingMessage = document.createElement('div');
    thinkingMessage.classList.add('ai-thinking');
    thinkingMessage.innerHTML = `
        <span>رِزْن يفكر</span>
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
    `;
    chatContainer.appendChild(thinkingMessage);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    try {
        // إرسال الطلب إلى الخادم الخلفي والذي يقرأ المفتاح من back/.env
        const response = await fetch('http://localhost:8001/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userMessage })
        });

        if (!response.ok) {
            throw new Error(`خطأ في API: ${response.status}`);
        }

        const data = await response.json();

        // إزالة رسالة "جاري التفكير"
        thinkingMessage.remove();

        // الخادم يرجع { reply }
        return data.reply || 'لم يتم استلام رد.';
    } catch (error) {
        console.error('Error calling backend /chat:', error);
        thinkingMessage.remove();
        return `❌ عذراً، حدث خطأ في الاتصال بالذكاء الاصطناعي: ${error.message}. يرجى التأكد من تشغيل الخادم الخلفي على http://localhost:8001`;
    }
}

// إرسال رسالة إلى الذكاء الاصطناعي
async function sendAiMessage() {
    const userInput = document.getElementById('ai-user-input');
    const chatContainer = document.getElementById('ai-chat-container');

    if (userInput.value.trim() !== '') {
        // إضافة رسالة المستخدم
        const userMessage = document.createElement('div');
        userMessage.classList.add('message', 'user-message');
        userMessage.textContent = userInput.value;
        chatContainer.appendChild(userMessage);

        const userQuestion = userInput.value;
        userInput.value = '';
        chatContainer.scrollTop = chatContainer.scrollHeight;

        // الحصول على رد الذكاء الاصطناعي
        const aiResponse = await getAIResponse(userQuestion);

        // إضافة رد الذكاء الاصطناعي
        const botMessage = document.createElement('div');
        botMessage.classList.add('message', 'bot-message');
        botMessage.innerHTML = aiResponse;
        chatContainer.appendChild(botMessage);
        chatContainer.scrollTop = chatContainer.scrollHeight;

        // نطق رد الذكاء الاصطناعي إذا كان التحدث التلقائي مفعل
        if (autoSpeakEnabled) {
            setTimeout(() => {
                speakText(aiResponse.replace(/[^\u0600-\u06FF\s]/g, '')); // إزالة الرموز التعبيرة
            }, 500);
        }
    }
}

// حفظ مفتاح API
function saveApiKey() {
    const apiKeyInput = document.getElementById('api-key-input');
    openaiApiKey = apiKeyInput.value.trim();
    localStorage.setItem('openaiApiKey', openaiApiKey);
    showNotification('تم حفظ مفتاح API بنجاح!');
    document.getElementById('api-key-section').style.display = 'none';
}

// أسئلة سريعة
function askQuickQuestion(question) {
    document.getElementById('ai-user-input').value = question;
    sendAiMessage();
}

// تهيئة النظام عند التحميل
window.onload = function() {
    // Theme init and toggle wiring
    initTheme();
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
        });
        updateThemeToggleButton();
    }

    // أولاً: عرض الصفحة الرئيسية حتى تكون عناصر DOM متاحة
    loadContent('main-page');

    // تحميل البيانات المحفوظة
    const civilId = localStorage.getItem('civilId');
    const fullName = localStorage.getItem('fullName');
    const weight = localStorage.getItem('weight');
    const height = localStorage.getItem('height');

    // تعيين القيم إن وُجدت العناصر
    if (civilId && fullName) {
        const civilEl = document.getElementById('civil-id');
        const nameEl = document.getElementById('full-name');
        if (civilEl) civilEl.value = civilId;
        if (nameEl) nameEl.value = fullName;
    }

    if (weight && height) {
        const weightEl = document.getElementById('weight');
        const heightEl = document.getElementById('height');
        if (weightEl) weightEl.value = weight;
        if (heightEl) heightEl.value = height;
    }

    // تهيئة اختيار اللغة (قد لا تكون في الصفحة الحالية)
    const langSelect = document.getElementById('lang-select');
    if (langSelect) langSelect.value = selectedLang;

    // تحميل السجلات الصحية إذا كانت موجودة
    loadHealthRecords();

    // تهيئة مفتاح API
    const savedApiKey = localStorage.getItem('openaiApiKey');
    if (savedApiKey) {
        const apiInput = document.getElementById('api-key-input');
        if (apiInput) apiInput.value = savedApiKey;
        openaiApiKey = savedApiKey;
        const apiSection = document.getElementById('api-key-section');
        if (apiSection) apiSection.style.display = 'none';
    }

    // تحميل إعدادات الصوت
    loadSpeechSettings();

    // تهيئة PWA
    initPWA();
};

// تهيئة PWA
function initPWA() {
    // تحديث حالة الاتصال
    updateOnlineStatus();

    // إظهار نافذة التثبيت إذا كان التطبيق غير مثبت
    if (window.matchMedia('(display-mode: standalone)').matches) {
        document.getElementById('installButton').style.display = 'none';
    }

    // تحديث شريط التقدم
    updateProgressBar();

    // إظهار رسالة ترحيب
    setTimeout(() => {
        showNotification('مرحباً بك في تطبيق رِزْن للتغذية الصحية!');
    }, 1000);
}

// PWA: تحديث حالة الاتصال
function updateOnlineStatus() {
    isOnline = navigator.onLine;
    if (isOnline) {
        document.getElementById('online-message').style.display = 'block';
        document.getElementById('offline-message').style.display = 'none';
    } else {
        document.getElementById('online-message').style.display = 'none';
        document.getElementById('offline-message').style.display = 'block';
    }
}

// PWA: حدث قبل التثبيت
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('installButton').style.display = 'block';
});

// PWA: تثبيت التطبيق
document.getElementById('installButton').addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            document.getElementById('installButton').style.display = 'none';
        }
        deferredPrompt = null;
    }
});

// PWA: مراقبة حالة الاتصال
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// وظائف التنقل بين الصفحات
function showPage(pageId) {
    document.querySelectorAll('.hidden').forEach(page => {
        page.classList.add('hidden');
    });
    document.getElementById(pageId).classList.remove('hidden');

    // إذا كانت صفحة المحادثة، نجهز نظام التعرف على الصوت والنطق
    if (pageId === 'conversation-page') {
        setupConversationPage();
    }

    // إذا كانت صفحة النظام الغذائي، نقوم بإنشاء خطة عشوائية
    if (pageId === 'diet-plan-page') {
        generatePersonalizedDietPlan();
    }

    // إذا كانت صفحة السجلات، نقوم بتحميل السجلات
    if (pageId === 'health-record-page') {
        loadHealthRecords();
    }
}

// إعداد صفحة المحادثة (مستقل لاستخدامه مع loadContent/showPage)
function setupConversationPage() {
    initSpeechRecognition();
    loadSpeechSettings();
    // تهيئة قائمة الأصوات وتحديثها عند تغيرها من النظام
    if (window.speechSynthesis) {
        try { populateVoiceList(); } catch (_) {}
        try { window.speechSynthesis.onvoiceschanged = populateVoiceList; } catch (_) {}
    }

    // إعادة تعيين خطوة المحادثة
    conversationStep = 0;

    // التحقق إذا كان المستخدم موجود مسبقاً
    const civilId = localStorage.getItem('civilId');
    const records = JSON.parse(localStorage.getItem('healthRecords') || '[]');
    const existingUser = records.find(record => record.civilId === civilId);

    const chatContainer = document.getElementById('chat-container');
    if (!chatContainer) return; // الحذر إذا لم تكن العناصر جاهزة بعد
    chatContainer.innerHTML = '';

    const welcomeMessage = document.createElement('div');
    welcomeMessage.classList.add('message', 'bot-message');

    // رسالة ترحيب مختلفة إذا كان المستخدم موجوداً مسبقاً
    if (existingUser && existingUser.preferences && existingUser.conversationDate) {
        welcomeMessage.innerHTML = `
            <div>أهلاً بعودتك! 😊</div>
            <div>سأسألك بعض الأسئلة الجديدة لتحديث تفضيلاتك.</div>
        `;
    } else {
        welcomeMessage.textContent = "مرحباً! أنا رِزْن، صديقك الجديد. سأسألك بعض الأسئلة لأعرف أكثر عن تفضيلاتك الغذائية.";
    }

    chatContainer.appendChild(welcomeMessage);

    // نطق رسالة الترحيب إذا كان التحدث التلقائي مفعل
    if (autoSpeakEnabled) {
        setTimeout(() => {
            if (existingUser && existingUser.preferences && existingUser.conversationDate) {
                speakText("أهلاً بعودتك! سأسألك بعض الأسئلة الجديدة لتحديث تفضيلاتك.");
            } else {
                speakText("مرحباً! أنا رِزْن، صديقك الجديد. سأسألك بعض الأسئلة لأعرف أكثر عن تفضيلاتك الغذائية.");
            }
        }, 500);
    }

    // البدء بأسئلة المحادثة بعد 1.5 ثانية
    setTimeout(() => {
        askNextQuestion();
    }, 1500);
}

// طرح السؤال التالي في المحادثة مع النطق - تم إصلاحها
function askNextQuestion() {
    if (conversationStep < conversationQuestions.length) {
        const chatContainer = document.getElementById('chat-container');
        const questionMessage = document.createElement('div');
        questionMessage.classList.add('message', 'bot-message');
        questionMessage.textContent = conversationQuestions[conversationStep];
        chatContainer.appendChild(questionMessage);
        chatContainer.scrollTop = chatContainer.scrollHeight;

        // نطق السؤال إذا كان التحدث التلقائي مفعل - تم إصلاحها
        if (autoSpeakEnabled) {
            // استخدام setTimeout لتأخير النطق قليلاً حتى يظهر السؤال أولاً
            setTimeout(() => {
                speakText(conversationQuestions[conversationStep]);
            }, 500);
        }

        conversationStep++;
    } else {
        // انتهاء الأسئلة، الانتقال إلى النظام الغذائي
        const chatContainer = document.getElementById('chat-container');
        const finalMessage = document.createElement('div');
        finalMessage.classList.add('message', 'bot-message');
        finalMessage.innerHTML = `
            <div>✨ خلصنا اليوم!</div>
            <div>سعيد إني كنت معك 😊</div>
            <div>تذكر دايم: الأكل الصحي يخليك أقوى وأذكى 💪🧠</div>
            <div>نشوفك المرة الجاية 👋</div>
        `;
        chatContainer.appendChild(finalMessage);
        chatContainer.scrollTop = chatContainer.scrollHeight;

        // نطق الرسالة النهائية إذا كان التحدث التلقائي مفعل
        if (autoSpeakEnabled) {
            setTimeout(() => {
                speakText("خلصنا اليوم! سعيد إني كنت معك. تذكر دايم: الأكل الصحي يخليك أقوى وأذكى. نشوفك المرة الجاية!");
            }, 500);
        }

        // حفظ التفضيلات في السجل الصحي
        saveUserPreferences();

        // الانتقال إلى صفحة النظام الغذائي بعد 3 ثوان
        setTimeout(() => {
            showPage('diet-plan-page');
        }, 3000);
    }
}

// حفظ تفضيلات المستخدم في السجل الصحي
function saveUserPreferences() {
    const civilId = localStorage.getItem('civilId');
    let records = JSON.parse(localStorage.getItem('healthRecords') || '[]');

    // البحث عن السجل الحالي للمستخدم
    const recordIndex = records.findIndex(record => record.civilId === civilId);

    if (recordIndex !== -1) {
        // تحديث السجل الحالي بإضافة التفضيلات
        records[recordIndex].preferences = userPreferences;
        records[recordIndex].conversationDate = new Date().toLocaleDateString('ar-SA');
    } else {
        // إنشاء سجل جديد مع التفضيلات
        const newRecord = {
            civilId: civilId,
            name: localStorage.getItem('fullName'),
            weight: localStorage.getItem('weight'),
            height: localStorage.getItem('height'),
            preferences: userPreferences,
            conversationDate: new Date().toLocaleDateString('ar-SA')
        };
        records.push(newRecord);
    }

    // حفظ السجلات المحدثة
    localStorage.setItem('healthRecords', JSON.stringify(records));
}

// إنشاء خطة غذائية مخصصة وعشوائية
function generatePersonalizedDietPlan() {
    // توليد رسالة مخصصة عشوائية
    const randomMessage = personalizedMessages[Math.floor(Math.random() * personalizedMessages.length)];
    document.getElementById('personalized-message').innerHTML = `
        <i class="fas fa-heart"></i> ${randomMessage}
    `;

    // توليد معلومات غذائية عشوائية بناءً على الوزن والطول
    const weight = parseInt(localStorage.getItem('weight')) || 50;
    const height = parseInt(localStorage.getItem('height')) || 150;

    // حساب السعرات الحرارية التقريبية بناءً على الوزن والطول
    const baseCalories = 1500 + (weight * 5) + (height * 0.5);
    const randomFactor = 0.8 + (Math.random() * 0.4); // عامل عشوائي بين 0.8 و 1.2

    const calories = Math.round(baseCalories * randomFactor);
    const protein = Math.round(calories * 0.15 / 4); // 15% من السعرات من البروتين
    const carbs = Math.round(calories * 0.55 / 4); // 55% من السعرات من الكربوهيدرات
    const fats = Math.round(calories * 0.3 / 9); // 30% من السعرات من الدهون

    document.getElementById('calories').textContent = `${calories} سعرة`;
    document.getElementById('protein').textContent = `${protein} غرام`;
    document.getElementById('carbs').textContent = `${carbs} غرام`;
    document.getElementById('fats').textContent = `${fats} غرام`;

    // توليد وجبات عشوائية لكل يوم مع كميات محددة
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const mealTypes = ['breakfast', 'snack1', 'lunch', 'snack2', 'dinner'];

    days.forEach(day => {
        mealTypes.forEach(mealType => {
            const quantityElement = document.getElementById(`${day}-${mealType}-quantity`);
            const descriptionElement = document.getElementById(`${day}-${mealType}`);

            if (quantityElement && descriptionElement) {
                const randomMeal = mealsDatabase[mealType][Math.floor(Math.random() * mealsDatabase[mealType].length)];
                quantityElement.textContent = randomMeal.quantity;
                descriptionElement.textContent = randomMeal.description;
            }
        });
    });

    showNotification('تم إنشاء نظامك الغذائي المخصص بنجاح!');
}

// توليد خطة غذائية جديدة
function generateNewPlan() {
    generatePersonalizedDietPlan();
    showNotification('تم توليد خطة غذائية جديدة!');
}

function showPasswordPage() {
    document.getElementById('password-input').value = '';
    showPage('password-page');
}

function checkPassword() {
    const password = document.getElementById('password-input').value;
    if (password === 'rzndoc') {
        showPage('health-record-page');
        openTab(event, 'view-record');
    } else {
        showNotification('كلمة المرور غير صحيحة. الرجاء المحاولة مرة أخرى.');
    }
}

function checkUserRecord() {
    const civilId = document.getElementById('civil-id').value;
    const fullName = document.getElementById('full-name').value;

    if (civilId && fullName) {
        // حفظ البيانات في sessionStorage (cache) + cookie + localStorage
        try { sessionStorage.setItem('civilId', civilId); } catch (_) {}
        try { sessionStorage.setItem('fullName', fullName); } catch (_) {}
        setCookie('civilId', civilId);
        setCookie('fullName', fullName);
        localStorage.setItem('civilId', civilId);
        localStorage.setItem('fullName', fullName);

        goToNextContent('measurements-page');
    } else {
        showNotification('الرجاء ملء جميع الحقول');
    }
}

function startConversation() {
    const weight = document.getElementById('weight').value;
    const height = document.getElementById('height').value;

    if (weight && height) {
        // حفظ البيانات في sessionStorage (cache) + cookie + localStorage
        try { sessionStorage.setItem('weight', weight); } catch (_) {}
        try { sessionStorage.setItem('height', height); } catch (_) {}
        setCookie('weight', weight);
        setCookie('height', height);
        localStorage.setItem('weight', weight);
        localStorage.setItem('height', height);

        goToNextContent('conversation-page');
    } else {
        showNotification('الرجاء ملء جميع الحقول');
    }
}

// تهيئة نظام التعرف على الكلام
function initSpeechRecognition() {
    // التحقق من دعم المتصفح للتعرف على الكلام
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();

        //設定 خصائص التعرف على الكلام
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = selectedLang;

        // تعريف event handlers
        recognition.onstart = function() {
            isListening = true;
            document.getElementById('speech-status').textContent = "جاري الاستماع...";
            document.getElementById('speech-status').classList.add("listening");
            document.getElementById('start-listening').classList.add('listening');
            document.getElementById('start-listening').innerHTML = '<i class="fas fa-microphone-slash"></i> إيقاف الاستماع';
        };

        recognition.onresult = function(event) {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            const combinedText = finalTranscript + interimTranscript;
            document.getElementById('speech-text').textContent = combinedText;
        };

        recognition.onerror = function(event) {
            console.error('خطأ في التعرف على الكلام:', event.error);
            showNotification('حدث خطأ في التعرف على الكلام. يرجى المحاولة مرة أخرى.');
            stopListening();
        };

        recognition.onend = function() {
            stopListening();
        };

    } else {
        // المتصفح لا يدعم التعرف على الكلام
        document.getElementById('speech-status').textContent = 
            'عذراً، متصفحك لا يدعم ميزة التعرف على الكلام. يرجى استخدام متصفح آخر مثل Chrome.';
        document.getElementById('start-listening').style.display = 'none';
    }
}

// تغيير لغة التعرف على الصوت
function changeLanguage() {
    selectedLang = document.getElementById('lang-select').value;
    localStorage.setItem('selectedLang', selectedLang);

    if (recognition) {
        recognition.lang = selectedLang;
    }

    // تحديث قائمة الأصوات لتلائم اللغة الجديدة
    try {
        populateVoiceList();
        // اختيار أفضل صوت للغة الجديدة إن كان الصوت الحالي لا يطابق
        const voices = speechSynthesis ? speechSynthesis.getVoices() : [];
        const current = voices.find(v => v.voiceURI === selectedVoiceURI);
        const langPrefix = (selectedLang || '').split('-')[0].toLowerCase();
        if (!current || !(current.lang || '').toLowerCase().startsWith(langPrefix)) {
            const best = findBestVoiceForLang(selectedLang, voices);
            if (best) {
                selectedVoiceURI = best.voiceURI;
                localStorage.setItem('selectedVoiceURI', selectedVoiceURI);
                const sel = document.getElementById('voice-select');
                if (sel) sel.value = selectedVoiceURI;
            }
        }
    } catch (_) { /* ignore */ }

    showNotification(`تم تغيير اللغة إلى ${document.getElementById('lang-select').options[document.getElementById('lang-select').selectedIndex].text}`);
}

// بدء/إيقاف الاستماع إلى الصوت
function toggleListening() {
    if (isListening) {
        stopListening();
    } else {
        startListening();
    }
}

// بدء الاستماع إلى الصوت
function startListening() {
    if (recognition && !isListening) {
        try {
            recognition.start();
        } catch (error) {
            console.error('خطأ في بدء الاستماع:', error);
            showNotification('تعذر بدء الاستماع. يرجى المحاولة مرة أخرى.');
        }
    }
}

// إيقاف الاستماع إلى الصوت
function stopListening() {
    if (isListening && recognition) {
        recognition.stop();
        isListening = false;
        document.getElementById('speech-status').textContent = "تم إيقاف الاستماع";
        document.getElementById('speech-status').classList.remove("listening");
        document.getElementById('start-listening').classList.remove('listening');
        document.getElementById('start-listening').innerHTML = '<i class="fas fa-microphone"></i> التحدث مع رِزْن';
    }
}

// مسح النص المعترف عليه
function clearTranscript() {
    document.getElementById('speech-text').textContent = 'النص المعترف به سيظهر هنا...';
    showNotification('تم مسح النص');
}

// إرسال النص المعترف عليه كمحادثة
function sendVoiceMessage() {
    const voiceText = document.getElementById('speech-text').textContent;
    if (voiceText && voiceText !== 'النص المعترف به سيظهر هنا...') {
        document.getElementById('user-input').value = voiceText;
        sendMessage();
        clearTranscript();
    } else {
        showNotification('لا يوجد نص لإرساله');
    }
}

// وظائف المحادثة
function sendMessage() {
    const userInput = document.getElementById('user-input');
    const chatContainer = document.getElementById('chat-container');

    if (userInput.value.trim() !== '') {
        // إضافة رسالة المستخدم
        const userMessage = document.createElement('div');
        userMessage.classList.add('message', 'user-message');
        userMessage.textContent = userInput.value;
        chatContainer.appendChild(userMessage);

        // حفظ إجابة المستخدم في التفضيلات
        if (conversationStep > 0) {
            const questionKey = `question_${conversationStep}`;
            userPreferences[questionKey] = userInput.value;
        }

        // محاكاة رد رِزْن
        setTimeout(() => {
            askNextQuestion();
        }, 1000);

        userInput.value = '';
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}

// إضافة إيموجي إلى حقل الإدخال
function addEmoji(emoji) {
    const userInput = document.getElementById('user-input');
    userInput.value += emoji;
    userInput.focus();
}

// السماح بإرسال الرسالة بالضغط على Enter
document.getElementById('user-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// السماح بإرسال الرسالة بالضغط على Enter في الدردشة AI
document.getElementById('ai-user-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendAiMessage();
    }
});

// وظائف إدارة السجلات الصحية
function saveHealthRecord() {
    const civilId = document.getElementById('record-civil-id').value;
    const name = document.getElementById('record-name').value;
    const age = document.getElementById('record-age').value;
    const gender = document.getElementById('record-gender').value;
    const weight = document.getElementById('record-weight').value;
    const height = document.getElementById('record-height').value;
    const healthInfo = document.getElementById('record-health-info').value;

    if (!civilId || !name || !age || !weight || !height) {
        showNotification('الرجاء ملء جميع الحقول الإلزامية');
        return;
    }

    // إنشاء كائن السجل الصحي
    const healthRecord = {
        civilId,
        name,
        age,
        gender,
        weight,
        height,
        healthInfo,
        date: new Date().toLocaleDateString('ar-SA')
    };

    // الحصول على السجلات الحالية من localStorage
    let records = JSON.parse(localStorage.getItem('healthRecords') || '[]');

    // التحقق من وجود سجل بنفس الرقم المدني
    const existingIndex = records.findIndex(record => record.civilId === civilId);

    if (existingIndex !== -1) {
        // تحديث السجل الموجود
        records[existingIndex] = healthRecord;
        showNotification('تم تحديث السجل الصحي بنجاح');
    } else {
        // إضافة سجل جديد
        records.push(healthRecord);
        showNotification('تم حفظ السجل الصحي بنجاح');
    }

    // حفظ السجلات في localStorage
    localStorage.setItem('healthRecords', JSON.stringify(records));

    // تحديث الجدول
    loadHealthRecords();

    // مسح الحقول
    document.getElementById('record-civil-id').value = '';
    document.getElementById('record-name').value = '';
    document.getElementById('record-age').value = '';
    document.getElementById('record-weight').value = '';
    document.getElementById('record-height').value = '';
    document.getElementById('record-health-info').value = '';

    // العودة إلى عرض السجلات
    openTab(event, 'view-record');
}

function loadHealthRecords() {
    const records = JSON.parse(localStorage.getItem('healthRecords') || '[]');
    const tableBody = document.querySelector('#health-records-table tbody');

    // مسح المحتوى الحالي للجدول
    tableBody.innerHTML = '';

    if (records.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">لا توجد سجلات صحية محفوظة</td></tr>';
        return;
    }

    // إضافة السجلات إلى الجدول
    records.forEach(record => {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${record.civilId}</td>
            <td>${record.name}</td>
            <td>${record.age || ''}</td>
            <td>${record.weight}</td>
            <td>${record.height}</td>
            <td>${record.date || ''}</td>
        `;

        tableBody.appendChild(row);
    });
}

function clearAllRecords() {
    if (confirm('هل أنت متأكد من أنك تريد حذف جميع السجلات الصحية؟ لا يمكن التراجع عن هذا الإجراء.')) {
        localStorage.removeItem('healthRecords');
        loadHealthRecords();
        showNotification('تم حذف جميع السجلات الصحية');
    }
}

// وظائف مساعدة
function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.style.display = 'block';

    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// وظائف التنقل في المحتوى العائم
function loadContent(contentId) {
    const template = document.getElementById(contentId);
    const floatingContent = document.getElementById('floating-content');

    if (template && floatingContent) {
        // نسخ المحتوى من القالب إلى المحتوى العائم
        floatingContent.innerHTML = template.innerHTML;
        currentContent = contentId;

        // إضافة إلى تاريخ التنقل
        if (navigationHistory[navigationHistory.length - 1] !== contentId) {
            navigationHistory.push(contentId);
        }

        // بعد إعادة بناء DOM، أعد توصيل الحقول القابلة للحفظ
        if (typeof wirePersistentFields === 'function') {
            wirePersistentFields();
        }

        // إذا كانت صفحة المحادثة تم تحميلها عبر loadContent، قم بالتهيئة أيضاً
        if (contentId === 'conversation-page') {
            setupConversationPage();
        }

        // إذا كانت صفحة النظام الغذائي، أنشئ الخطة
        if (contentId === 'diet-plan-page') {
            generatePersonalizedDietPlan();
        }

        // إذا كانت صفحة السجلات الصحية، قم بالتحميل
        if (contentId === 'health-record-page') {
            loadHealthRecords();
        }
    }
}

function goToNextContent(nextContentId) {
    loadContent(nextContentId);
}

function goBackContent() {
    if (navigationHistory.length > 1) {
        navigationHistory.pop(); // إزالة المحتوى الحالي
        const previousContent = navigationHistory[navigationHistory.length - 1];
        loadContent(previousContent);
    } else {
        loadContent('main-page');
    }
}

function openTab(evt, tabName) {
    const tabcontent = document.getElementsByClassName("tabcontent");
    for (let i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    const tablinks = document.getElementsByClassName("tablinks");
    for (let i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}

function openDay(evt, dayName) {
    const tabcontent = document.getElementsByClassName("tabcontent");
    for (let i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    const tablinks = document.getElementsByClassName("tablinks");
    for (let i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    document.getElementById(dayName).style.display = "block";
    evt.currentTarget.className += " active";
}

function printDietPlan() {
    window.print();
}

// تحديث شريط التقدم
  function updateProgressBar() {
      const progressBar = document.getElementById('main-progress');
      const healthRecords = JSON.parse(localStorage.getItem('healthRecords')) || [];
  
      if (healthRecords.length > 0) {
          progressBar.style.width = '100%';
      } else {
          progressBar.style.width = '0%';
      }
  }
  
  // Cookie helpers
  function setCookie(name, value, days = 365) {
      try {
          const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
          document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
      } catch (e) { /* no-op */ }
  }

  function getCookie(name) {
      const key = encodeURIComponent(name) + "=";
      const parts = document.cookie.split(/;\s*/);
      for (const part of parts) {
          if (part.startsWith(key)) {
              return decodeURIComponent(part.substring(key.length));
          }
      }
      return null;
  }

  // Unified getter: sessionStorage -> cookie -> localStorage
  function getPersisted(key) {
      const ss = sessionStorage.getItem(key);
      if (ss !== null) return ss;
      const ck = getCookie(key);
      if (ck !== null) return ck;
      return localStorage.getItem(key);
  }

  // Helper to persist a field's value to sessionStorage (cache) with cookie/localStorage fallback
  function persistFieldValue(fieldId, storageKey = fieldId) {
      const el = document.getElementById(fieldId);
      if (!el) return;
      // Load saved value: prefer sessionStorage (cache), then cookie, then localStorage
      const ssVal = sessionStorage.getItem(storageKey);
      const cookieVal = getCookie(storageKey);
      const saved = ssVal !== null ? ssVal : (cookieVal !== null ? cookieVal : localStorage.getItem(storageKey));
      if (saved !== null) {
          el.value = saved;
      }
      // Save on input to sessionStorage, cookie, and localStorage (compatibility)
      el.addEventListener('input', function () {
          try { sessionStorage.setItem(storageKey, el.value); } catch (_) {}
          setCookie(storageKey, el.value);
          localStorage.setItem(storageKey, el.value);
      });
  }

  // Re-wire all persistent fields that may exist in the current view
  function wirePersistentFields() {
      persistFieldValue('civil-id', 'civilId');
      persistFieldValue('full-name', 'fullName');
      persistFieldValue('weight', 'weight');
      persistFieldValue('height', 'height');
      persistFieldValue('api-key-input', 'openaiApiKey');
  }

  // تحديث عرض قيم الإعدادات عند التغيير
  document.addEventListener('DOMContentLoaded', function() {
      // تحديث القيم المعروضة عند تغيير المنزلقات
      document.getElementById('speech-rate').addEventListener('input', function() {
          document.getElementById('rate-value').textContent = this.value;
      });
  
      document.getElementById('speech-pitch').addEventListener('input', function() {
          document.getElementById('pitch-value').textContent = this.value;
      });
  
      document.getElementById('speech-volume').addEventListener('input', function() {
          document.getElementById('volume-value').textContent = (this.value * 100).toFixed(0) + '%';
      });
  
      // Persist key input fields so users don't have to re-enter them
      persistFieldValue('civil-id', 'civilId');
      persistFieldValue('full-name', 'fullName');
      persistFieldValue('weight', 'weight');
      persistFieldValue('height', 'height');
      persistFieldValue('api-key-input', 'openaiApiKey');
  });
