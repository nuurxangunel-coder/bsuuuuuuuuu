// Global variables
let socket;
let currentUser = null;
let currentAdmin = null;
let currentFaculty = null;
let currentPrivateChatUser = null;
let verificationQuestions = [];

// Faculties list
const faculties = [
    'Mexanika-riyaziyyat fakültəsi',
    'Tətbiqi riyaziyyat və kibernetika fakültəsi',
    'Fizika fakültəsi',
    'Kimya fakültəsi',
    'Biologiya fakültəsi',
    'Ekologiya və torpaqşünaslıq fakültəsi',
    'Coğrafiya fakültəsi',
    'Geologiya fakültəsi',
    'Filologiya fakültəsi',
    'Tarix fakültəsi',
    'Beynəlxalq münasibətlər və iqtisadiyyat fakültəsi',
    'Hüquq fakültəsi',
    'Jurnalistika fakültəsi',
    'İnformasiya və sənəd menecmenti fakültəsi',
    'Şərqşünaslıq fakültəsi',
    'Sosial elmlər və psixologiya fakültəsi'
];

// Check session on page load
document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    setupAuthTabs();
    setupAvatarSelection();
});

// Setup auth tabs
function setupAuthTabs() {
    const tabs = document.querySelectorAll('.auth-tab');
    const forms = document.querySelectorAll('.auth-form');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetForm = tab.dataset.tab;

            tabs.forEach(t => t.classList.remove('active'));
            forms.forEach(f => f.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(`${targetForm}-form`).classList.add('active');

            // Clear error messages
            document.querySelectorAll('.error-message').forEach(e => {
                e.classList.remove('show');
                e.textContent = '';
            });
        });
    });
}

// Setup avatar selection
function setupAvatarSelection() {
    const avatarOptions = document.querySelectorAll('.avatar-option');
    
    avatarOptions.forEach(option => {
        option.addEventListener('click', () => {
            avatarOptions.forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            document.getElementById('register-avatar').value = option.dataset.avatar;
        });
    });
}

// Check session
async function checkSession() {
    try {
        const response = await fetch('/api/check-session');
        const data = await response.json();

        if (data.loggedIn) {
            if (data.userType === 'user') {
                currentUser = data.user;
                showChatPage();
            } else if (data.userType === 'admin') {
                currentAdmin = data.admin;
                showAdminPage();
            }
        }
    } catch (error) {
        console.error('Session check error:', error);
    }
}

// Show verification questions
async function showVerification(type) {
    try {
        // Validate form first
        if (type === 'register') {
            const fullname = document.getElementById('register-fullname').value.trim();
            const phone = document.getElementById('register-phone').value.trim();
            const emailPrefix = document.getElementById('register-email-prefix').value.trim();
            const password = document.getElementById('register-password').value;
            const faculty = document.getElementById('register-faculty').value;
            const degree = document.getElementById('register-degree').value;
            const course = document.getElementById('register-course').value;
            const avatar = document.getElementById('register-avatar').value;

            if (!fullname || !phone || !emailPrefix || !password || !faculty || !degree || !course || !avatar) {
                showError('register', 'Bütün xanaları doldurun');
                return;
            }

            if (phone.length !== 9 || !/^\d+$/.test(phone)) {
                showError('register', 'Telefon nömrəsi 9 rəqəmdən ibarət olmalıdır');
                return;
            }
        }

        // Get verification questions
        const response = await fetch('/api/get-verification-questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();
        verificationQuestions = data.questions;

        // Show verification section
        const verificationSection = document.getElementById(`${type}-verification`);
        const questionsContainer = document.getElementById(`${type}-questions`);
        questionsContainer.innerHTML = '';

        verificationQuestions.forEach((q, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'verification-question';
            questionDiv.innerHTML = `
                <p>${index + 1}. ${q.q}</p>
                <div class="verification-options" data-question-index="${index}">
                    ${q.options.map(opt => `
                        <div class="verification-option" data-answer="${opt}">${opt}</div>
                    `).join('')}
                </div>
            `;
            questionsContainer.appendChild(questionDiv);
        });

        // Add click handlers for options
        document.querySelectorAll('.verification-option').forEach(option => {
            option.addEventListener('click', function() {
                const optionsContainer = this.parentElement;
                optionsContainer.querySelectorAll('.verification-option').forEach(o => o.classList.remove('selected'));
                this.classList.add('selected');
            });
        });

        verificationSection.style.display = 'block';

        // Change button
        const button = verificationSection.parentElement.querySelector('.btn-primary');
        button.textContent = type === 'register' ? 'Qeydiyyatdan keç' : 'Daxil ol';
        button.onclick = () => type === 'register' ? handleRegister() : handleLogin();

    } catch (error) {
        console.error('Get verification questions error:', error);
        showError(type, 'Xəta baş verdi');
    }
}

// Handle registration
async function handleRegister() {
    try {
        const fullname = document.getElementById('register-fullname').value.trim();
        const phone = '+994' + document.getElementById('register-phone').value.trim();
        const emailPrefix = document.getElementById('register-email-prefix').value.trim();
        const email = emailPrefix + '@bsu.edu.az';
        const password = document.getElementById('register-password').value;
        const faculty = document.getElementById('register-faculty').value;
        const degree = document.getElementById('register-degree').value;
        const course = document.getElementById('register-course').value;
        const avatar = document.getElementById('register-avatar').value;

        // Get answers
        const answers = [];
        document.querySelectorAll('.verification-options').forEach((container, index) => {
            const selected = container.querySelector('.verification-option.selected');
            if (selected) {
                answers.push({
                    question: verificationQuestions[index].q,
                    answer: selected.dataset.answer
                });
            }
        });

        if (answers.length < 3) {
            showError('register', 'Bütün sualları cavablandırın');
            return;
        }

        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                full_name: fullname,
                phone,
                email,
                password,
                faculty,
                degree,
                course: parseInt(course),
                avatar: parseInt(avatar),
                answers
            })
        });

        const data = await response.json();

        if (data.success) {
            alert('Qeydiyyat uğurlu! İndi daxil ola bilərsiniz.');
            // Switch to login tab
            document.querySelector('[data-tab="login"]').click();
            // Clear form
            document.getElementById('register-form').reset();
            document.getElementById('register-verification').style.display = 'none';
        } else {
            showError('register', data.message);
        }
    } catch (error) {
        console.error('Registration error:', error);
        showError('register', 'Xəta baş verdi');
    }
}

// Handle login
async function handleLogin() {
    try {
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
            showError('login', 'Email və şifrə daxil edin');
            return;
        }

        // Check if verification is shown
        const verificationSection = document.getElementById('login-verification');
        if (verificationSection.style.display === 'none' || !verificationSection.style.display) {
            // Show verification first
            await showVerification('login');
            return;
        }

        // Get answers
        const answers = [];
        document.querySelectorAll('#login-questions .verification-options').forEach((container, index) => {
            const selected = container.querySelector('.verification-option.selected');
            if (selected) {
                answers.push({
                    question: verificationQuestions[index].q,
                    answer: selected.dataset.answer
                });
            }
        });

        if (answers.length < 3) {
            showError('login', 'Bütün sualları cavablandırın');
            return;
        }

        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, answers })
        });

        const data = await response.json();

        if (data.success) {
            currentUser = data.user;
            showChatPage();
        } else {
            showError('login', data.message);
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('login', 'Xəta baş verdi');
    }
}

// Handle admin login
async function handleAdminLogin() {
    try {
        const username = document.getElementById('admin-username').value.trim();
        const password = document.getElementById('admin-password').value;

        if (!username || !password) {
            showError('admin', 'İstifadəçi adı və şifrə daxil edin');
            return;
        }

        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            currentAdmin = data.admin;
            showAdminPage();
        } else {
            showError('admin', data.message);
        }
    } catch (error) {
        console.error('Admin login error:', error);
        showError('admin', 'Xəta baş verdi');
    }
}

// Show error message
function showError(type, message) {
    const errorEl = document.getElementById(`${type}-error`);
    errorEl.textContent = message;
    errorEl.classList.add('show');
    setTimeout(() => {
        errorEl.classList.remove('show');
    }, 5000);
}

// Logout
async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        
        if (socket) {
            socket.disconnect();
        }
        
        currentUser = null;
        currentAdmin = null;
        
        document.getElementById('auth-page').style.display = 'flex';
        document.getElementById('chat-page').style.display = 'none';
        document.getElementById('admin-page').style.display = 'none';
        
        // Clear forms
        document.querySelectorAll('input').forEach(input => input.value = '');
        document.querySelectorAll('.error-message').forEach(e => {
            e.classList.remove('show');
            e.textContent = '';
        });
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Show chat page
function showChatPage() {
    document.getElementById('auth-page').style.display = 'none';
    document.getElementById('chat-page').style.display = 'block';
    document.getElementById('admin-page').style.display = 'none';
    
    // Set user info
    document.getElementById('user-name').textContent = currentUser.full_name;
    document.getElementById('user-faculty').textContent = currentUser.faculty;
    document.getElementById('user-course').textContent = `${currentUser.degree} • ${currentUser.course}-ci kurs`;
    
    const avatarSrc = `/avatars/${currentUser.avatar === 1 ? 'boy' : 'girl'}.png`;
    document.getElementById('user-avatar').src = avatarSrc;
    
    // Load faculties
    loadFaculties();
    
    // Load settings
    loadSettings();
    
    // Initialize Socket.IO
    initializeSocket();
}

// Load faculties
function loadFaculties() {
    const container = document.getElementById('faculties-container');
    container.innerHTML = '';
    
    faculties.forEach(faculty => {
        const item = document.createElement('div');
        item.className = 'faculty-item';
        item.textContent = faculty;
        item.onclick = () => selectFaculty(faculty);
        container.appendChild(item);
    });
}

// Select faculty
function selectFaculty(faculty) {
    console.log('🏫 Selecting faculty:', faculty);
    
    // Leave previous faculty
    if (currentFaculty && currentFaculty !== faculty) {
        console.log('👋 Leaving previous faculty:', currentFaculty);
        socket.emit('leave-faculty', currentFaculty);
    }
    
    currentFaculty = faculty;
    
    // Update UI
    document.querySelectorAll('.faculty-item').forEach(item => {
        item.classList.remove('active');
        if (item.textContent === faculty) {
            item.classList.add('active');
        }
    });
    
    document.getElementById('current-faculty-name').textContent = faculty;
    document.querySelector('.no-faculty-selected').style.display = 'none';
    document.getElementById('message-input-container').style.display = 'flex';
    
    // Clear previous messages IMMEDIATELY
    const container = document.getElementById('messages-container');
    container.innerHTML = '<div style="text-align: center; padding: 20px; color: #999;">Yüklənir...</div>';
    
    // Join new faculty room
    console.log('📥 Joining faculty:', faculty);
    socket.emit('join-faculty', faculty);
    
    // Load messages for this faculty
    loadGroupMessages(faculty);
}

// Load group messages with caching
const messageCache = {};

async function loadGroupMessages(faculty) {
    try {
        console.log('📨 Loading messages for faculty:', faculty);
        
        const response = await fetch(`/api/messages/group/${encodeURIComponent(faculty)}?limit=100`);
        const data = await response.json();
        
        if (data.success) {
            const container = document.getElementById('messages-container');
            container.innerHTML = ''; // Clear loading message
            
            // Cache messages
            messageCache[faculty] = data.messages;
            
            console.log(`✅ Loaded ${data.messages.length} messages for ${faculty}`);
            
            // Optimized batch rendering with DocumentFragment
            const fragment = document.createDocumentFragment();
            data.messages.forEach(msg => {
                const messageElement = createMessageElement(msg);
                fragment.appendChild(messageElement);
            });
            container.appendChild(fragment);
            
            scrollToBottom();
        }
    } catch (error) {
        console.error('❌ Load group messages error:', error);
        const container = document.getElementById('messages-container');
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: #f00;">Xəta baş verdi</div>';
    }
}

// Create message element (optimized)
function createMessageElement(msg) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    messageDiv.dataset.messageId = msg.id;
    messageDiv.dataset.userId = msg.user_id;
    
    const avatarSrc = `/avatars/${msg.avatar === 1 ? 'boy' : 'girl'}.png`;
    const time = formatTime(msg.created_at);
    const facultyName = msg.faculty || msg.user_faculty || '';
    
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <img src="${avatarSrc}" alt="Avatar" loading="lazy">
        </div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-author">${escapeHtml(msg.full_name)}</span>
                <span class="message-info">${escapeHtml(facultyName)} • ${escapeHtml(msg.degree)} • ${msg.course}-ci kurs</span>
            </div>
            <div class="message-text">${escapeHtml(msg.message)}</div>
            <div class="message-time">${time}</div>
        </div>
        ${msg.user_id !== currentUser.id ? `
            <button class="message-menu-btn" onclick="toggleMessageMenu(${msg.id})">⋮</button>
            <div class="message-menu" id="message-menu-${msg.id}">
                <button onclick="openPrivateChat(${msg.user_id})">💬 Şəxsi mesaj</button>
                <button onclick="blockUser(${msg.user_id})">🚫 Əngəllə</button>
                <button onclick="reportUser(${msg.user_id})">⚠️ Şikayət et</button>
            </div>
        ` : ''}
    `;
    
    return messageDiv;
}

// Display group message (for real-time messages)
function displayGroupMessage(msg) {
    const container = document.getElementById('messages-container');
    const messageElement = createMessageElement(msg);
    container.appendChild(messageElement);
}

// Send message
function sendMessage() {
    const input = document.getElementById('message-input');
    const message = input.value.trim();
    
    console.log('📤 Attempting to send message:', { message, faculty: currentFaculty, socketConnected: socket?.connected });
    
    if (!message) {
        console.log('⚠️ Empty message');
        return;
    }
    
    if (!currentFaculty) {
        console.log('⚠️ No faculty selected');
        return;
    }
    
    if (!socket || !socket.connected) {
        console.error('❌ Socket not connected');
        alert('Connection error. Please refresh the page.');
        return;
    }
    
    console.log('📡 Emitting send-group-message event...');
    socket.emit('send-group-message', {
        faculty: currentFaculty,
        message: message
    });
    
    console.log('✅ Message sent to server');
    input.value = '';
}

// Handle Enter key
document.addEventListener('DOMContentLoaded', () => {
    const messageInput = document.getElementById('message-input');
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
});

// Initialize Socket.IO
function initializeSocket() {
    socket = io({
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 500,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 10,
        timeout: 10000
    });
    
    socket.on('connect', () => {
        console.log('✅ Connected to server, Socket ID:', socket.id);
        
        // Rejoin current faculty if exists
        if (currentFaculty) {
            console.log('🔄 Rejoining faculty:', currentFaculty);
            socket.emit('join-faculty', currentFaculty);
        }
    });
    
    socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error.message);
    });
    
    socket.on('reconnect', (attemptNumber) => {
        console.log('🔄 Reconnected after', attemptNumber, 'attempts');
        
        // Reload messages after reconnection
        if (currentFaculty) {
            loadGroupMessages(currentFaculty);
        }
    });
    
    socket.on('disconnect', (reason) => {
        console.log('⚠️ Disconnected from server:', reason);
        if (reason === 'io server disconnect') {
            // Server disconnected - try to reconnect manually
            socket.connect();
        }
    });
    
    socket.on('error', (error) => {
        console.error('❌ Socket error:', error);
        if (error.message && error.message.includes('Session expired')) {
            alert('Session expired. Please login again.');
            logout();
        }
    });
    
    socket.on('new-group-message', (msg) => {
        console.log('📨 Received new group message:', msg);
        
        // CRITICAL: Only display if this message is for current faculty
        if (msg.faculty && currentFaculty && msg.faculty === currentFaculty) {
            console.log('✅ Message is for current faculty, displaying...');
            displayGroupMessage(msg);
            scrollToBottom();
        } else {
            console.log('⚠️ Message is for different faculty, ignoring', {
                messageFaculty: msg.faculty,
                currentFaculty: currentFaculty
            });
        }
    });
    
    socket.on('user-joined', (data) => {
        console.log('👥 User joined:', data.user.full_name);
    });
    
    socket.on('new-private-message', (msg) => {
        console.log('💬 Received new private message:', msg);
        if (currentPrivateChatUser && 
            (msg.sender_id === currentPrivateChatUser.id || msg.receiver_id === currentPrivateChatUser.id)) {
            displayPrivateMessage(msg);
            scrollPrivateChatToBottom();
        }
    });
}

// Toggle message menu
function toggleMessageMenu(messageId) {
    const menu = document.getElementById(`message-menu-${messageId}`);
    
    // Close all other menus
    document.querySelectorAll('.message-menu').forEach(m => {
        if (m.id !== `message-menu-${messageId}`) {
            m.classList.remove('show');
        }
    });
    
    menu.classList.toggle('show');
}

// Close menus when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.message-menu-btn')) {
        document.querySelectorAll('.message-menu').forEach(m => {
            m.classList.remove('show');
        });
    }
    
    if (!e.target.closest('.user-menu-btn')) {
        document.getElementById('user-menu').classList.remove('show');
    }
});

// Open private chat
async function openPrivateChat(userId) {
    try {
        const response = await fetch(`/api/users/${userId}`);
        const data = await response.json();
        
        if (data.success) {
            currentPrivateChatUser = data.user;
            
            document.getElementById('private-chat-title').textContent = data.user.full_name;
            document.getElementById('private-chat-modal').classList.add('show');
            
            // Join private chat room
            socket.emit('join-private-chat', userId);
            
            // Load messages
            await loadPrivateMessages(userId);
            
            scrollPrivateChatToBottom();
        }
    } catch (error) {
        console.error('Open private chat error:', error);
    }
}

// Load private messages
async function loadPrivateMessages(userId) {
    try {
        const response = await fetch(`/api/messages/private/${userId}`);
        const data = await response.json();
        
        if (data.success) {
            const container = document.getElementById('private-messages-container');
            container.innerHTML = '';
            
            if (data.blocked) {
                container.innerHTML = '<div style="text-align: center; padding: 20px; color: #999;">Bu istifadəçi əngəllənib</div>';
                document.querySelector('.private-message-input input').disabled = true;
                document.querySelector('.private-message-input .btn-send').disabled = true;
                return;
            }
            
            document.querySelector('.private-message-input input').disabled = false;
            document.querySelector('.private-message-input .btn-send').disabled = false;
            
            data.messages.forEach(msg => {
                displayPrivateMessage(msg);
            });
        }
    } catch (error) {
        console.error('Load private messages error:', error);
    }
}

// Display private message
function displayPrivateMessage(msg) {
    const container = document.getElementById('private-messages-container');
    
    const isSent = msg.sender_id === currentUser.id;
    const messageDiv = document.createElement('div');
    messageDiv.className = `private-message ${isSent ? 'sent' : 'received'}`;
    
    const avatarSrc = `/avatars/${msg.avatar === 1 ? 'boy' : 'girl'}.png`;
    const time = formatTime(msg.created_at);
    
    messageDiv.innerHTML = `
        <div class="private-message-avatar">
            <img src="${avatarSrc}" alt="Avatar">
        </div>
        <div class="private-message-content">
            <div class="private-message-text">${escapeHtml(msg.message)}</div>
            <div class="private-message-time">${time}</div>
        </div>
    `;
    
    container.appendChild(messageDiv);
}

// Send private message
function sendPrivateMessage() {
    const input = document.getElementById('private-message-input');
    const message = input.value.trim();
    
    if (!message || !currentPrivateChatUser) return;
    
    socket.emit('send-private-message', {
        receiverId: currentPrivateChatUser.id,
        message: message
    });
    
    input.value = '';
}

// Handle Enter key for private messages
document.addEventListener('DOMContentLoaded', () => {
    const privateInput = document.getElementById('private-message-input');
    if (privateInput) {
        privateInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendPrivateMessage();
            }
        });
    }
});

// Close private chat
function closePrivateChat() {
    if (currentPrivateChatUser) {
        socket.emit('leave-private-chat', currentPrivateChatUser.id);
    }
    
    currentPrivateChatUser = null;
    document.getElementById('private-chat-modal').classList.remove('show');
}

// Block user
async function blockUser(userId) {
    try {
        const response = await fetch(`/api/users/block/${userId}`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(data.blocked ? 'İstifadəçi əngəlləndi' : 'Əngəl qaldırıldı');
            
            // Reload messages
            if (currentFaculty) {
                loadGroupMessages(currentFaculty);
            }
        }
    } catch (error) {
        console.error('Block user error:', error);
    }
}

// Report user
async function reportUser(userId) {
    try {
        const response = await fetch(`/api/users/report/${userId}`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Şikayət göndərildi');
        }
    } catch (error) {
        console.error('Report user error:', error);
    }
}

// Toggle user menu
function toggleUserMenu() {
    document.getElementById('user-menu').classList.toggle('show');
}

// Show edit profile
function showEditProfile() {
    document.getElementById('edit-fullname').value = currentUser.full_name;
    document.getElementById('edit-faculty').value = currentUser.faculty;
    document.getElementById('edit-degree').value = currentUser.degree;
    document.getElementById('edit-course').value = currentUser.course;
    document.getElementById('edit-profile-modal').classList.add('show');
}

// Close edit profile
function closeEditProfile() {
    document.getElementById('edit-profile-modal').classList.remove('show');
}

// Save profile
async function saveProfile() {
    try {
        const full_name = document.getElementById('edit-fullname').value.trim();
        const faculty = document.getElementById('edit-faculty').value;
        const degree = document.getElementById('edit-degree').value;
        const course = document.getElementById('edit-course').value;
        
        const response = await fetch('/api/users/update-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name, faculty, degree, course: parseInt(course) })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser.full_name = full_name;
            currentUser.faculty = faculty;
            currentUser.degree = degree;
            currentUser.course = parseInt(course);
            
            document.getElementById('user-name').textContent = full_name;
            document.getElementById('user-faculty').textContent = faculty;
            document.getElementById('user-course').textContent = `${degree} • ${course}-ci kurs`;
            
            closeEditProfile();
            alert('Profil yeniləndi');
        }
    } catch (error) {
        console.error('Save profile error:', error);
        alert('Xəta baş verdi');
    }
}

// Load settings
async function loadSettings() {
    try {
        const response = await fetch('/api/settings');
        const data = await response.json();
        
        if (data.success) {
            const settings = data.settings;
            
            // Topic of day
            if (settings.topic_of_day && settings.topic_of_day.trim()) {
                document.getElementById('topic-of-day').style.display = 'block';
                document.querySelector('.topic-text').textContent = settings.topic_of_day;
            } else {
                document.getElementById('topic-of-day').style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Load settings error:', error);
    }
}

// Show rules
async function showRules() {
    try {
        const response = await fetch('/api/settings');
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('rules-content').textContent = data.settings.rules || 'Qaydalar hələ əlavə edilməyib';
            document.getElementById('rules-modal').classList.add('show');
        }
    } catch (error) {
        console.error('Show rules error:', error);
    }
}

// Close rules
function closeRules() {
    document.getElementById('rules-modal').classList.remove('show');
}

// Show about
async function showAbout() {
    try {
        const response = await fetch('/api/settings');
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('about-content').textContent = data.settings.about || 'Haqqında məlumat hələ əlavə edilməyib';
            document.getElementById('about-modal').classList.add('show');
        }
    } catch (error) {
        console.error('Show about error:', error);
    }
}

// Close about
function closeAbout() {
    document.getElementById('about-modal').classList.remove('show');
}

// Utility functions
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 24) {
        return date.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' });
    } else {
        return date.toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit' }) + ' ' + 
               date.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' });
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Optimized scroll with debounce
let scrollTimeout;
function scrollToBottom() {
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        const container = document.getElementById('messages-container');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }, 50);
}

function scrollPrivateChatToBottom() {
    const container = document.getElementById('private-messages-container');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

// Admin Page Functions

// Show admin page
async function showAdminPage() {
    document.getElementById('auth-page').style.display = 'none';
    document.getElementById('chat-page').style.display = 'none';
    document.getElementById('admin-page').style.display = 'block';
    
    document.getElementById('admin-username-display').textContent = currentAdmin.username;
    
    // Show sub-admins tab only for super admin
    if (currentAdmin.is_super_admin) {
        document.getElementById('sub-admins-tab').style.display = 'block';
    }
    
    // Load users
    await loadUsers();
    
    // Load settings
    await loadAdminSettings();
}

// Show admin tab
function showAdminTab(tabName) {
    document.querySelectorAll('.admin-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.admin-tab-content').forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(`admin-${tabName}`).classList.add('active');
    
    if (tabName === 'users') {
        loadUsers();
    } else if (tabName === 'reported') {
        loadReportedUsers();
    } else if (tabName === 'sub-admins') {
        loadSubAdmins();
    }
}

// Load users
async function loadUsers() {
    try {
        const response = await fetch('/api/admin/users');
        const data = await response.json();
        
        if (data.success) {
            const tbody = document.getElementById('users-table-body');
            tbody.innerHTML = '';
            
            document.getElementById('users-count').textContent = `(${data.total})`;
            
            data.users.forEach(user => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${user.full_name}</td>
                    <td>${user.email}</td>
                    <td>${user.phone}</td>
                    <td>${user.faculty}</td>
                    <td>${user.degree}</td>
                    <td>${user.course}</td>
                    <td><span class="status-badge ${user.is_active ? 'status-active' : 'status-inactive'}">${user.is_active ? 'Aktiv' : 'Deaktiv'}</span></td>
                    <td>
                        <button class="btn-toggle ${user.is_active ? 'active' : 'inactive'}" onclick="toggleUserActive(${user.id})">
                            ${user.is_active ? 'Deaktiv et' : 'Aktiv et'}
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (error) {
        console.error('Load users error:', error);
    }
}

// Toggle user active
async function toggleUserActive(userId) {
    try {
        const response = await fetch(`/api/admin/users/${userId}/toggle-active`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            loadUsers();
        }
    } catch (error) {
        console.error('Toggle user active error:', error);
    }
}

// Load reported users
async function loadReportedUsers() {
    try {
        const response = await fetch('/api/admin/users');
        const data = await response.json();
        
        if (data.success) {
            const tbody = document.getElementById('reported-table-body');
            tbody.innerHTML = '';
            
            const reportedUsers = data.users.filter(user => user.report_count >= 8);
            
            if (reportedUsers.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #999;">Şikayət edilmiş istifadəçi yoxdur</td></tr>';
                return;
            }
            
            reportedUsers.forEach(user => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${user.full_name}</td>
                    <td>${user.email}</td>
                    <td>${user.faculty}</td>
                    <td><span style="color: #dc3545; font-weight: 600;">${user.report_count} şikayət</span></td>
                    <td><span class="status-badge ${user.is_active ? 'status-active' : 'status-inactive'}">${user.is_active ? 'Aktiv' : 'Deaktiv'}</span></td>
                    <td>
                        <button class="btn-toggle ${user.is_active ? 'active' : 'inactive'}" onclick="toggleUserActive(${user.id})">
                            ${user.is_active ? 'Deaktiv et' : 'Aktiv et'}
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (error) {
        console.error('Load reported users error:', error);
    }
}

// Load admin settings
async function loadAdminSettings() {
    try {
        const response = await fetch('/api/settings');
        const data = await response.json();
        
        if (data.success) {
            const settings = data.settings;
            
            document.getElementById('topic-input').value = settings.topic_of_day || '';
            document.getElementById('rules-input').value = settings.rules || '';
            document.getElementById('about-input').value = settings.about || '';
            document.getElementById('filter-input').value = settings.filter_words || '';
            document.getElementById('group-lifetime').value = settings.group_message_lifetime_hours || '2';
            document.getElementById('private-lifetime').value = settings.private_message_lifetime_hours || '2';
        }
    } catch (error) {
        console.error('Load admin settings error:', error);
    }
}

// Save topic
async function saveTopic() {
    try {
        const value = document.getElementById('topic-input').value;
        
        const response = await fetch('/api/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'topic_of_day', value })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Günün mövzusu yeniləndi');
        }
    } catch (error) {
        console.error('Save topic error:', error);
        alert('Xəta baş verdi');
    }
}

// Save rules
async function saveRules() {
    try {
        const value = document.getElementById('rules-input').value;
        
        const response = await fetch('/api/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'rules', value })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Qaydalar yeniləndi');
        }
    } catch (error) {
        console.error('Save rules error:', error);
        alert('Xəta baş verdi');
    }
}

// Save about
async function saveAbout() {
    try {
        const value = document.getElementById('about-input').value;
        
        const response = await fetch('/api/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'about', value })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Haqqında məlumatı yeniləndi');
        }
    } catch (error) {
        console.error('Save about error:', error);
        alert('Xəta baş verdi');
    }
}

// Save filter
async function saveFilter() {
    try {
        const value = document.getElementById('filter-input').value;
        
        const response = await fetch('/api/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'filter_words', value })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Filtr sözləri yeniləndi');
        }
    } catch (error) {
        console.error('Save filter error:', error);
        alert('Xəta baş verdi');
    }
}

// Save message lifetime
async function saveMessageLifetime() {
    try {
        const groupLifetime = document.getElementById('group-lifetime').value;
        const privateLifetime = document.getElementById('private-lifetime').value;
        
        await fetch('/api/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'group_message_lifetime_hours', value: groupLifetime })
        });
        
        await fetch('/api/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'private_message_lifetime_hours', value: privateLifetime })
        });
        
        alert('Mesaj silinmə vaxtı yeniləndi');
    } catch (error) {
        console.error('Save message lifetime error:', error);
        alert('Xəta baş verdi');
    }
}

// Load sub-admins
async function loadSubAdmins() {
    try {
        const response = await fetch('/api/admin/sub-admins');
        const data = await response.json();
        
        if (data.success) {
            const tbody = document.getElementById('sub-admins-table-body');
            tbody.innerHTML = '';
            
            if (data.admins.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px; color: #999;">Alt admin yoxdur</td></tr>';
                return;
            }
            
            data.admins.forEach(admin => {
                const tr = document.createElement('tr');
                const createdDate = new Date(admin.created_at).toLocaleString('az-AZ');
                tr.innerHTML = `
                    <td>${admin.username}</td>
                    <td>${createdDate}</td>
                    <td>
                        <button class="btn-delete" onclick="deleteSubAdmin(${admin.id})">Sil</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (error) {
        console.error('Load sub-admins error:', error);
    }
}

// Create sub-admin
async function createSubAdmin() {
    try {
        const username = document.getElementById('new-admin-username').value.trim();
        const password = document.getElementById('new-admin-password').value;
        
        if (!username || !password) {
            alert('İstifadəçi adı və şifrə daxil edin');
            return;
        }
        
        const response = await fetch('/api/admin/sub-admins', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Alt admin yaradıldı');
            document.getElementById('new-admin-username').value = '';
            document.getElementById('new-admin-password').value = '';
            loadSubAdmins();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Create sub-admin error:', error);
        alert('Xəta baş verdi');
    }
}

// Delete sub-admin
async function deleteSubAdmin(adminId) {
    if (!confirm('Bu admini silmək istədiyinizdən əminsiniz?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/sub-admins/${adminId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Alt admin silindi');
            loadSubAdmins();
        }
    } catch (error) {
        console.error('Delete sub-admin error:', error);
        alert('Xəta baş verdi');
    }
}
