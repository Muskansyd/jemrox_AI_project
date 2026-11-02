class Chat {
  constructor(id = Date.now(), name = 'New Chat', type = 'build') {
    this.id = id;
    this.name = name;
    this.type = type;
    this.messages = [];
    this.attachedFiles = [];
    this.createdAt = new Date().toISOString();
    this.status = 'active';
    this.description = '';
  }

  addMessage(text, sender = 'user', attachedFiles = []) {
    this.messages.push({
      sender: String(sender),
      text: String(text),
      mode: String(sender),
      content: String(text),
      timestamp: new Date().toISOString(),
      attachedFiles: attachedFiles || []
    });
  }
}

const appState = {
  currentUser: JSON.parse(localStorage.getItem('Jemrox_user')) || null,
  currentTheme: localStorage.getItem('Jemrox_theme') || 'dark',
  currentMode: 'build',
  projects: JSON.parse(localStorage.getItem('Jemrox_projects')) || [],
  buildChats: [],
  techChats: [],
  currentBuildChatId: null,
  currentTechChatId: null,
  currentChat: null,
  activeBuildProjectId: JSON.parse(localStorage.getItem('Jemrox_active_project')) || null,
  hiddenProjects: JSON.parse(localStorage.getItem('Jemrox_hidden_projects')) || [],
  hiddenChats: JSON.parse(localStorage.getItem('Jemrox_hidden_chats')) || [],
  uploads: JSON.parse(localStorage.getItem('Jemrox_uploads')) || [],
  isThinking: false,
  attachedFiles: []
};

var codeEditorState = {
  currentCode: {},
  currentTab: null,
  currentView: 'code'
};

function reconstructChat(plainChat) {
  if (!plainChat) return null;
  if (plainChat.addMessage && typeof plainChat.addMessage === 'function') return plainChat;
  const chat = new Chat(plainChat.id, plainChat.name, plainChat.type);
  chat.attachedFiles = plainChat.attachedFiles || [];
  chat.createdAt = plainChat.createdAt || new Date().toISOString();
  chat.status = plainChat.status || 'active';
  chat.description = plainChat.description || '';
  if (plainChat.messages && Array.isArray(plainChat.messages)) {
    chat.messages = plainChat.messages.map(function (msg) {
      return {
        sender: msg.sender || msg.role || 'user',
        text: msg.text || '',
        timestamp: msg.timestamp || new Date().toISOString(),
        attachedFiles: msg.attachedFiles || []
      };
    });
  }
  return chat;
}

function loadChatsFromStorage() {
  var userEmail = appState.currentUser ? appState.currentUser.email : 'default';
  var buildData = localStorage.getItem('Jemrox_buildChats_' + userEmail);
  appState.buildChats = buildData ? JSON.parse(buildData).map(reconstructChat) : [];
  var techData = localStorage.getItem('Jemrox_techChats_' + userEmail);
  appState.techChats = techData ? JSON.parse(techData).map(reconstructChat) : [];
}

function saveChatsToStorage(chatType) {
  var userEmail = appState.currentUser ? appState.currentUser.email : 'default';
  if (chatType === 'build' || chatType === 'all') {
    localStorage.setItem('Jemrox_buildChats_' + userEmail, JSON.stringify(appState.buildChats));
  }
  if (chatType === 'tech' || chatType === 'all') {
    localStorage.setItem('Jemrox_techChats_' + userEmail, JSON.stringify(appState.techChats));
  }
}

function saveProjectsToStorage() {
  localStorage.setItem('Jemrox_projects', JSON.stringify(appState.projects));
}

function saveHiddenProjectsToStorage() {
  localStorage.setItem('Jemrox_hidden_projects', JSON.stringify(appState.hiddenProjects));
}

function saveHiddenChatsToStorage() {
  localStorage.setItem('Jemrox_hidden_chats', JSON.stringify(appState.hiddenChats));
}

document.addEventListener('DOMContentLoaded', function () {
  initializeTheme();
  setupSplashScreen();
  setupScrollReveal();
  setupFAQ();
  setupEventListeners();
  loadChatsFromStorage();
  updateUserProfile();

  var lastMode = localStorage.getItem('Jemrox_current_mode') || 'build';
  appState.currentMode = lastMode;

  document.querySelectorAll('.mode-btn').forEach(function (btn) {
    btn.classList.remove('active');
    if (btn.dataset.mode === lastMode) btn.classList.add('active');
  });

  if (lastMode === 'build') {
    if (appState.activeBuildProjectId) {
      var proj = appState.projects.find(function (p) { return p.id === appState.activeBuildProjectId; });
      if (proj) {
        openBuildChat(appState.activeBuildProjectId);
      } else {
        appState.activeBuildProjectId = null;
        document.getElementById('chatMessages').innerHTML = '';
      }
    }
    updateChatHistory('build');
  } else if (lastMode === 'tech') {
    createNewTechChat();
    loadChatMessages(appState.currentChat);
    updateChatHistory('tech');
  }
});

function setupSplashScreen() {
  var splash = document.getElementById('splashScreen');
  setTimeout(function () {
    if (splash) splash.classList.add('hidden');
  }, 2500);
}

function setupScrollReveal() {
  var reveals = document.querySelectorAll('.reveal-on-scroll');
  if (!reveals.length) return;

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  reveals.forEach(function (el) { observer.observe(el); });
}

function setupFAQ() {
  document.querySelectorAll('.faq-question').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = this.closest('.faq-item');
      var isOpen = item.classList.contains('open');

      document.querySelectorAll('.faq-item.open').forEach(function (openItem) {
        openItem.classList.remove('open');
        openItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
      });

      if (!isOpen) {
        item.classList.add('open');
        this.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

function initializeTheme() {
  setTheme(localStorage.getItem('Jemrox_theme') || 'dark');
}

function setTheme(theme) {
  appState.currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('Jemrox_theme', theme);
  updateThemeButtons();

  var toggle = document.getElementById('themeToggle');
  if (toggle) {
    if (theme === 'light') toggle.classList.add('active');
    else toggle.classList.remove('active');
  }

  var lightBtn = document.getElementById('lightModeBtn');
  var darkBtn = document.getElementById('darkModeBtn');
  if (lightBtn && darkBtn) {
    lightBtn.classList.remove('active');
    darkBtn.classList.remove('active');
    if (theme === 'light') lightBtn.classList.add('active');
    else darkBtn.classList.add('active');
  }
}

function updateThemeButtons() {
  document.querySelectorAll('.theme-option').forEach(function (btn) {
    btn.classList.remove('active');
  });
  var active = document.querySelector('[data-theme="' + appState.currentTheme + '"]');
  if (active) active.classList.add('active');
}

function on(id, event, handler) {
  var node = document.getElementById(id);
  if (node) node.addEventListener(event, handler);
}

function setupEventListeners() {
  on('buildBtn', 'click', function () {
    showAppPage();
    openBuildChat();
  });

  on('signUpForm', 'submit', handleSignUp);
  on('signInForm', 'submit', handleSignIn);
  on('closeAuthBtn', 'click', closeAuthModal);

  on('switchToSignIn', 'click', function () {
    document.getElementById('signUpTab').classList.add('hidden');
    document.getElementById('signInTab').classList.remove('hidden');
  });
  on('switchToSignUp', 'click', function () {
    document.getElementById('signInTab').classList.add('hidden');
    document.getElementById('signUpTab').classList.remove('hidden');
  });

  document.querySelectorAll('.theme-option').forEach(function (btn) {
    btn.addEventListener('click', function () { setTheme(this.dataset.theme); });
  });

  on('hideAllProjectsBtn', 'click', function () {
    appState.hiddenProjects = appState.projects.map(function (p) { return p.id; });
    saveHiddenProjectsToStorage();
    updateChatHistory('build');
  });
  on('hideAllChatsBtn', 'click', function () {
    appState.hiddenChats = appState.techChats.map(function (c) { return c.id; });
    saveHiddenChatsToStorage();
    updateChatHistory('tech');
  });
  on('unhideAllBtn', 'click', function () {
    appState.hiddenProjects = [];
    appState.hiddenChats = [];
    saveHiddenProjectsToStorage();
    saveHiddenChatsToStorage();
    updateChatHistory(appState.currentMode);
  });

  on('logoutBtn', 'click', handleLogout);

  document.querySelectorAll('.mode-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      switchMode(this.dataset.mode);
    });
  });

  document.querySelectorAll('.device-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.device-btn').forEach(function (b) { b.classList.remove('active'); });
      this.classList.add('active');
      updatePreview(this.dataset.device);
    });
  });

  on('addBtn', 'click', toggleUploadMenu);
  document.querySelectorAll('.upload-option').forEach(function (btn) {
    btn.addEventListener('click', function () {
      handleUpload(this.dataset.type);
    });
  });

  on('mainInput', 'keypress', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });
  on('sendBtn', 'click', handleSendMessage);

  on('previewToggleBtn', 'click', togglePreviewPanel);
  on('closePreviewBtn', 'click', hidePreviewPanel);

  on('fullscreenBtn', 'click', function () {
    document.getElementById('fullscreenModal').classList.remove('hidden');
    document.getElementById('fullscreenPreview').innerHTML = document.getElementById('previewContainer').innerHTML;
  });
  on('closeFullscreen', 'click', function () {
    document.getElementById('fullscreenModal').classList.add('hidden');
  });

  on('codeEditorBtn', 'click', openCodeEditorPanel);
  on('closeCodePanelBtn', 'click', closeCodeEditorPanel);
  on('copyCodeBtn', 'click', copyCodeToClipboard);
  on('downloadProjectBtn', 'click', downloadProject);
  on('addFileBtn', 'click', addNewFile);
  on('addFolderBtn', 'click', addNewFolder);
  on('codeViewBtn', 'click', function () { switchCodeEditorView('code'); });
  on('previewViewBtn', 'click', function () { switchCodeEditorView('preview'); });

  on('codeEditorTextarea', 'input', function () {
    codeEditorState.currentCode[codeEditorState.currentTab] = this.value;
    localStorage.setItem('Jemrox_code_editor_state', JSON.stringify(codeEditorState));
    var escaped = this.value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    var highlighted = highlightCode(escaped);
    var el = document.getElementById('codeEditorHighlight');
    if (el) el.querySelector('code').innerHTML = highlighted;
  });

  on('newChatBtn', 'click', function () {
    startNewChatSession(appState.currentMode);
  });
  on('closeModeModal', 'click', function () {
    document.getElementById('modeSelectionModal').classList.add('hidden');
  });
  document.querySelectorAll('.mode-selection-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      handleModeSelection(this.dataset.mode);
    });
  });

  on('profileBtn', 'click', function (e) {
    e.stopPropagation();
    var menu = document.getElementById('profileMenu');
    if (menu) menu.classList.toggle('hidden');
  });

  var settingsModal = document.getElementById('settingsModal');
  var settingsBtn = document.getElementById('settingsBtn');
  var closeSettingsBtn = document.getElementById('closeSettingsBtn');

  if (settingsBtn && settingsModal) {
    settingsBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var profileMenu = document.getElementById('profileMenu');
      if (profileMenu) profileMenu.classList.add('hidden');
      settingsModal.classList.remove('hidden');
    });
  }
  if (closeSettingsBtn && settingsModal) {
    closeSettingsBtn.addEventListener('click', function () {
      settingsModal.classList.add('hidden');
    });
  }
  if (settingsModal) {
    settingsModal.addEventListener('click', function (e) {
      if (e.target === settingsModal) settingsModal.classList.add('hidden');
    });
  }
}

function showAuthModal() {
  document.getElementById('authModal').classList.remove('hidden');
  document.getElementById('signUpTab').classList.remove('hidden');
  document.getElementById('signInTab').classList.add('hidden');
}

function closeAuthModal() {
  document.getElementById('authModal').classList.add('hidden');
}

async function handleSignUp(e) {
  e.preventDefault();

  var username = document.getElementById('signUpName').value.trim();
  var email = document.getElementById('signUpEmail').value.trim();
  var password = document.getElementById('signUpPassword').value.trim();

  if (!username || !email || !password) {
    alert("Please fill in all registration fields.");
    return;
  }

  try {
    const response = await fetch("https://jemrox-ai-project.vercel.app/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ username: username, email: email, password: password })
    });

    const contentType = response.headers.get("content-type");
    let data = null;

    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP server error status code: ${response.status}`);
    }

    if (response.ok) {
      alert("🎉 Account created successfully! Please proceed to login.");
      document.getElementById('signInEmail').value = email;
    } else {
      alert(data?.detail || "Registration criteria constraints violation.");
    }
  } catch (error) {
    alert("⚠️ Server Intercept Message: " + error.message);
  }
}

async function handleSignIn(e) {
  e.preventDefault();

  var email = document.getElementById('signInEmail').value.trim();
  var password = document.getElementById('signInPassword').value.trim();

  if (!email || !password) {
    alert("Please fill in all login credentials blocks.");
    return;
  }

  try {
    const response = await fetch("https://jemrox-ai-project.vercel.app/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ email: email, password: password })
    });

    const contentType = response.headers.get("content-type");
    let data = null;

    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP server login error status code: ${response.status}`);
    }

    if (response.ok && data) {
      var user = {
        id: data.user_id,
        name: data.username,
        email: data.email
      };

      appState.currentUser = user;
      localStorage.setItem('Jemrox_user', JSON.stringify(user));
      localStorage.setItem('token', data.access_token);

      updateUserProfile();
      closeAuthModal();
      showAppPage();
      alert("Login successful! Welcome back.");
    } else {
      alert(data?.detail || "Authentication verification check failure.");
    }
  } catch (error) {
    alert("⚠️ Server Login Intercept Message: " + error.message);
  }
}

function handleLogout() {
  appState.currentUser = null;
  localStorage.removeItem('Jemrox_user');
  localStorage.removeItem('token');
  updateUserProfile();
  document.getElementById('appPage').classList.add('hidden');
  document.getElementById('landingPage').style.display = 'block';
  window.scrollTo(0, 0);
}

function updateUserProfile() {
  var user = JSON.parse(localStorage.getItem('Jemrox_user'));
  var loginBtn = document.getElementById("loginBtn");
  var userProfile = document.getElementById("userProfile");
  var userName = document.getElementById("userName");

  if (user) {
    if (loginBtn) loginBtn.style.display = "none";
    if (userProfile) userProfile.style.display = "block";
    if (userName) userName.innerText = user.name;
  } else {
    if (loginBtn) loginBtn.style.display = "block";
    if (userProfile) userProfile.style.display = "none";
  }
}

function showAppPage() {
  document.getElementById('landingPage').style.display = 'none';
  window.scrollTo(0, 0);
  document.getElementById('appPage').classList.remove('hidden');
  if (appState.currentUser) updateUserProfile();
  updateChatHistory(appState.currentMode);
}

function switchMode(mode) {
  var input = document.getElementById('mainInput');
  var chatContainer = document.getElementById('chatContainer');
  var editorContent = document.getElementById('editorContent');

  appState.currentMode = mode;
  localStorage.setItem('Jemrox_current_mode', mode);

  document.querySelectorAll('.mode-btn').forEach(function (btn) {
    btn.classList.remove('active');
    if (btn.dataset.mode === mode) btn.classList.add('active');
  });

  input.value = '';
  clearAttachedFiles();

  if (mode === 'build') {
    onEditorOpen();
    input.placeholder = 'Describe the website you want to build...';
    editorContent.style.display = 'flex';
    chatContainer.classList.add('hidden');
    appState.activeBuildProjectId = null;
    localStorage.setItem('Jemrox_active_project', JSON.stringify(null));
    document.getElementById('chatMessages').innerHTML = '';
    updateChatHistory('build');
  } else if (mode === 'tech') {
    onEditorOpen();
    input.placeholder = 'Ask me anything about tech...';
    editorContent.style.display = 'none';
    chatContainer.classList.remove('hidden');
    createNewTechChat();
    loadChatMessages(appState.currentChat);
    updateChatHistory('tech');
  }
}

function startNewChatSession(mode) {
  var input = document.getElementById('mainInput');
  input.value = '';
  clearAttachedFiles();

  if (mode === 'build') {
    appState.activeBuildProjectId = null;
    localStorage.setItem('Jemrox_active_project', JSON.stringify(null));
    document.getElementById('chatMessages').innerHTML = '';
    document.getElementById('editorContent').style.display = 'flex';
    document.getElementById('chatContainer').classList.add('hidden');
  } else if (mode === 'tech') {
    closeCodeEditorPanel();
    createNewTechChat();
    loadChatMessages(appState.currentChat);
  }
}

function handleModeSelection(mode) {
  document.getElementById('modeSelectionModal').classList.add('hidden');
  switchMode(mode);
  startNewChatSession(mode);
}

const sidebarElement = document.querySelector('.sidebar');
const menuButton = document.getElementById('menuIcon');
if (menuButton) {
  menuButton.onclick = function () {
    sidebarElement.classList.remove('hidden');
    menuButton.classList.add('hidden');
  };
}

function onEditorOpen() {
  const sidebar = document.querySelector('.sidebar');
  const menuIcon = document.getElementById('menuIcon');
  if (sidebar) sidebar.classList.add('hidden');
  if (menuIcon) menuIcon.classList.remove('hidden');
}

function onEditorClose() {
  const sidebar = document.querySelector('.sidebar');
  const menuIcon = document.getElementById('menuIcon');
  if (sidebar) sidebar.classList.remove('hidden');
  if (menuIcon) menuIcon.classList.add('hidden');
}

async function handleSendMessage(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  if (appState.isLoading) return;

  var input = document.getElementById('mainInput');
  var message = input.value.trim();
  var attachedFiles = appState.attachedFiles || [];

  if (!message && attachedFiles.length === 0) return;

  if (!appState.currentUser) {
    showAuthModal();
    return;
  }

  appState.isLoading = true;
  try {
    if (appState.currentMode === 'build') {
      await handleBuildRequest(message, attachedFiles);
    } else if (appState.currentMode === 'tech') {
      await sendChatMessage(message, attachedFiles, 'tech');
    }
    input.value = '';
    clearAttachedFiles();
  } catch (err) {
    showToast("Server connection error!");
  } finally {
    appState.isLoading = false;
  }
}

async function handleBuildRequest(description, attachedFiles) {
  var project;

  if (appState.activeBuildProjectId) {
    project = appState.projects.find(function (p) {
      return p.id === appState.activeBuildProjectId;
    });
  }

  if (!project) {
    project = {
      id: Date.now(),
      name: description.substring(0, 50),
      description: description,
      createdAt: new Date().toISOString(),
      status: 'creating',
      attachedFiles: attachedFiles || [],
      messages: []
    };
    appState.projects.push(project);
    appState.activeBuildProjectId = project.id;
  }

  document.getElementById('editorContent').style.display = 'none';
  document.getElementById('chatContainer').classList.remove('hidden');

  project.messages.push({
    sender: 'user',
    text: description,
    timestamp: new Date().toISOString(),
    attachedFiles: attachedFiles || []
  });

  saveProjectsToStorage();
  localStorage.setItem('Jemrox_active_project', JSON.stringify(appState.activeBuildProjectId));

  var chatMessages = document.getElementById('chatMessages');
  var userMsg = document.createElement('div');
  userMsg.className = 'chat-message user';
  var html = '<div class="message-content user">' + escapeHtml(description);
  if (attachedFiles && attachedFiles.length > 0) {
    html += '<div class="attached-files-display">';
    attachedFiles.forEach(function (file) {
      if (file.type === 'image') html += '<img src="' + file.dataUrl + '" alt="' + file.name + '" class="message-attachment-image">';
      else html += '<div class="message-attachment-file">' + file.name + '</div>';
    });
    html += '</div>';
  }
  html += '</div>';
  userMsg.innerHTML = html;
  chatMessages.appendChild(userMsg);
  autoScrollToLatestMessage();

  openCodeEditorPanel();
  showBuildLoadingState(chatMessages);
  showThinkingIndicator(chatMessages);

  const aiData = await sendToBackend(description, attachedFiles);
  removeThinkingIndicator();

  if (!aiData || !aiData.ai_response) {
    showToast("AI response failed");
    return;
  }

  project.messages.push({
    sender: 'ai',
    text: aiData.ai_response,
    timestamp: new Date().toISOString()
  });
  saveProjectsToStorage();

  try {
    let text = aiData.ai_response;
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}') + 1;

    if (start !== -1 && end > 0) {
      const webCode = JSON.parse(text.substring(start, end));
      if (typeof updateFileSidebar === "function") updateFileSidebar(webCode);
      if (typeof renderWebsite === "function") renderWebsite(webCode.html, webCode.css, webCode.js);
    }
  } catch (e) { }

  var aiMsg = document.createElement('div');
  aiMsg.className = 'chat-message ai';
  aiMsg.innerHTML = '<div class="message-content ai">' + formatMessage(aiData.ai_response) + '</div>';
  chatMessages.appendChild(aiMsg);

  autoScrollToLatestMessage();
  updateChatHistory('build');
}

function createNewTechChat() {
  var newChat = new Chat(Date.now(), 'New Tech Chat', 'tech');
  if (!appState.techChats) appState.techChats = [];
  appState.techChats.push(newChat);
  appState.currentChat = newChat;
  appState.currentTechChatId = newChat.id;
  return newChat;
}

async function sendChatMessage(message, attachedFiles, chatType) {
  const token = localStorage.getItem('token');
  const chatMessages = document.getElementById('chatMessages');
  const editorContent = document.getElementById('editorContent');
  const chatContainer = document.getElementById('chatContainer');

  if (editorContent) editorContent.style.display = 'none';
  if (chatContainer) chatContainer.classList.remove('hidden');

  appendMessageToUI('user', message, attachedFiles);
  showThinkingIndicator(chatMessages);

  if (appState.currentChat) {
    if (typeof appState.currentChat.addMessage === "function") {
      appState.currentChat.addMessage(message, 'user');
    } else if (appState.currentChat.messages) {
      appState.currentChat.messages.push({ text: message, sender: 'user', mode: 'user', content: message });
    }
    saveChatsToStorage('tech');
    updateChatHistory('tech');
  }

  try {
    const response = await fetch("https://jemrox-ai-project.vercel.app/chat/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({
        content: String(message),
        chat_id: String(appState.currentTechChatId || Date.now()),
        mode: appState.currentMode,
        user_id: appState.currentUser ? parseInt(appState.currentUser.id) : 0
      })
    });

    removeThinkingIndicator();

    if (response.ok) {
      const data = await response.json();

      if (appState.currentMode === 'build') {
        try {
          let text = data.ai_response;
          const start = text.indexOf('{');
          const end = text.lastIndexOf('}') + 1;

          if (start !== -1 && end > 0) {
            const cleanJson = text.substring(start, end);
            const webCode = JSON.parse(cleanJson);

            const currentId = appState.currentTechChatId || appState.activeBuildProjectId;
            let project = appState.projects.find(p => String(p.id) === String(currentId));

            if (project) {
              project.webCode = webCode;
              saveProjectsToStorage();
            }

            if (appState.activeBuildProjectId) {
              let project = appState.projects.find(p => p.id === appState.activeBuildProjectId);
              if (project) {
                project.webCode = webCode;
                saveProjectsToStorage();
              }
            }

            if (typeof updateFileSidebar === "function") updateFileSidebar(webCode);
            if (typeof renderWebsite === "function") renderWebsite(webCode.html, webCode.css, webCode.js);

            appendMessageToUI('ai', "Website files generated! Check the editor. 🌸");
          } else {
            appendMessageToUI('ai', text);
          }
        } catch (parseErr) {
          appendMessageToUI('ai', "Format error! Showing raw response:\n" + data.ai_response);
        }
      } else {
        appendMessageToUI('ai', data.ai_response);
      }

      if (appState.currentChat) {
        if (typeof appState.currentChat.addMessage === "function") {
          appState.currentChat.addMessage(data.ai_response, 'ai');
        } else if (appState.currentChat.messages) {
          appState.currentChat.messages.push({ text: data.ai_response, sender: 'ai', mode: 'ai', content: data.ai_response });
        }
        saveChatsToStorage('tech');
        updateChatHistory('tech');
      }
    }
  } catch (error) {
    removeThinkingIndicator();
  }
  updateChatPreview();
}

function appendMessageToUI(sender, text, files = []) {
  var chatMessages = document.getElementById('chatMessages');
  var msgDiv = document.createElement('div');
  msgDiv.className = 'chat-message ' + sender;

  var contentHtml = sender === 'ai' ? formatMessage(text) : escapeHtml(text);

  if (files && files.length > 0) {
    contentHtml += '<div class="attached-files-display">';
    files.forEach(function (file) {
      if (file.type === 'image') {
        contentHtml += `<img src="${file.dataUrl}" alt="${file.name}" class="message-attachment-image">`;
      } else {
        contentHtml += `<div class="message-attachment-file">${file.name}</div>`;
      }
    });
    contentHtml += '</div>';
  }

  msgDiv.innerHTML = `<div class="message-content ${sender}">${contentHtml}</div>`;
  chatMessages.appendChild(msgDiv);
  autoScrollToLatestMessage();
}

updateChatPreview();

function showThinkingIndicator(container) {
  appState.isThinking = true;
  var el = document.createElement('div');
  el.className = 'chat-message ai';
  el.id = 'thinking-msg';
  el.innerHTML = '<div class="thinking-indicator"><span>Thinking</span><div class="thinking-dots"><span></span><span></span><span></span></div></div>';
  container.appendChild(el);
  autoScrollToLatestMessage();
}

function removeThinkingIndicator() {
  var el = document.getElementById('thinking-msg');
  if (el) el.remove();
  appState.isThinking = false;
}

function escapeHtml(text) {
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatMessage(content) {
  return content
    .replace(/```(\w*)\n([\s\S]*?)```/g, function (match, lang, code) {
      let highlighted = code
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"(.*?)"/g, '<span style="color: #ce9178;">"$1"</span>')
        .replace(/'(.*?)'/g, "<span style='color: #ce9178;'>'$1'</span>")
        .replace(/\b(def|function|var|let|const|if|else|return|import|from|class|while|for|try|except|async|await)\b/g, '<span style="color: #569cd6; font-weight: bold;">$1</span>')
        .replace(/\/\/(.*)/g, '<span style="color: #6a9955; font-style: italic;">//$1</span>')
        .replace(/# (.*)/g, '<span style="color: #6a9955; font-style: italic;"># $1</span>');

      return `<div style="background:#1e1e1e; color:#d4d4d4; padding:12px; border-radius:8px; overflow-x:auto; margin:8px 0; font-family:var(--font-mono); font-size:12px; border: 1px solid #333;">
                  <div style="font-size: 10px; color: #888; text-transform: uppercase; margin-bottom: 5px; border-bottom: 1px solid #333; padding-bottom: 2px;">${lang || 'code'}</div>
                  <pre style="margin:0;"><code>${highlighted}</code></pre>
                </div>`;
    })
    .replace(/`([^`]+)`/g, '<code style="background:var(--bg-input);padding:2px 6px;border-radius:4px;font-family:var(--font-mono);font-size:12px;color:#d7ba7d;">$1</code>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

function autoScrollToLatestMessage() {
  var el = document.getElementById('chatMessages');
  if (el) setTimeout(function () { el.scrollTop = el.scrollHeight; }, 50);
}

function showToast(message) {
  var toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;bottom:2rem;right:2rem;background:var(--accent);color:#09090b;padding:12px 20px;border-radius:8px;z-index:10000;font-size:14px;font-weight:600;font-family:var(--font);animation:slideUp 0.3s ease-out;box-shadow:0 4px 20px rgba(0,212,255,0.3);';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(function () {
    toast.style.animation = 'fadeOut 0.3s ease-out forwards';
    setTimeout(function () { toast.remove(); }, 300);
  }, 2500);
}

function showBuildLoadingState(container) {
  var loadingMsg = document.createElement('div');
  loadingMsg.className = 'chat-message ai build-loading';
  loadingMsg.id = 'build-loading-msg';
  loadingMsg.innerHTML = `
    <div class="message-content ai">
      <div class="build-loader">
        <div class="build-step" data-step="1">
          <div class="build-step-indicator">
            <svg class="build-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
            </svg>
          </div>
          <span>Analyzing your request...</span>
        </div>
        <div class="build-step" data-step="2">
          <div class="build-step-indicator">
            <svg class="build-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
            </svg>
          </div>
          <span>Generating HTML structure...</span>
        </div>
        <div class="build-step" data-step="3">
          <div class="build-step-indicator">
            <svg class="build-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
            </svg>
          </div>
          <span>Styling with CSS...</span>
        </div>
        <div class="build-step" data-step="4">
          <div class="build-step-indicator">
            <svg class="build-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
            </svg>
          </div>
          <span>Finalizing preview...</span>
        </div>
      </div>
    </div>
  `;
  container.appendChild(loadingMsg);
  autoScrollToLatestMessage();
  animateBuildSteps();
}

function animateBuildSteps() {
  var steps = document.querySelectorAll('.build-step');
  var currentStep = 0;

  var interval = setInterval(function () {
    steps.forEach(function (step, idx) {
      step.classList.remove('active', 'completed');
      if (idx < currentStep) step.classList.add('completed');
      else if (idx === currentStep) step.classList.add('active');
    });

    currentStep++;
    if (currentStep > steps.length) {
      clearInterval(interval);
      var loadingMsg = document.getElementById('build-loading-msg');
      if (loadingMsg) {
        loadingMsg.style.opacity = '0';
        setTimeout(function () { if (loadingMsg) loadingMsg.remove(); }, 300);
      }
    }
  }, 1000);
}

function togglePreviewPanel() {
  var panel = document.getElementById('previewPanel');
  var btn = document.getElementById('previewToggleBtn');
  if (panel.classList.contains('visible')) {
    hidePreviewPanel();
  } else {
    panel.classList.add('visible');
    if (btn) btn.classList.add('active');
  }
}

function hidePreviewPanel() {
  var panel = document.getElementById('previewPanel');
  var btn = document.getElementById('previewToggleBtn');
  panel.classList.remove('visible');
  if (btn) btn.classList.remove('active');
}

function loadChatMessages(chat) {
  var chatMessages = document.getElementById('chatMessages');
  if (!chatMessages) return;
  chatMessages.innerHTML = '';
  if (!chat || !chat.messages) return;

  chat.messages.forEach(function (msg) {
    var sender = msg.sender || msg.mode || (msg.user_id === 0 ? 'ai' : 'user');
    var text = msg.text || msg.content || '';

    var div = document.createElement('div');
    div.className = 'chat-message ' + sender;

    var html = '<div class="message-content ' + sender + '">' +
      (sender === 'ai' ? formatMessage(text) : escapeHtml(text));

    if (msg.attachedFiles && msg.attachedFiles.length > 0) {
      html += '<div class="attached-files-display">';
      msg.attachedFiles.forEach(function (file) {
        if (file.type === 'image') {
          html += '<img src="' + file.dataUrl + '" alt="' + file.name + '" class="message-attachment-image">';
        } else {
          html += '<div class="message-attachment-file">' + file.name + '</div>';
        }
      });
      html += '</div>';
    }
    html += '</div>';
    div.innerHTML = html;
    chatMessages.appendChild(div);
  });

  autoScrollToLatestMessage();
  updateChatPreview();
}

function updateChatHistory(chatType) {
  var historyEl = document.getElementById('chatHistory');
  if (!historyEl) return;

  var modeToDisplay = chatType || appState.currentMode;
  var items, itemType;
  if (modeToDisplay === 'build') {
    items = appState.projects || [];
    itemType = 'project';
  } else {
    items = appState.techChats || [];
    itemType = 'chat';
  }

  if (!items || items.length === 0) {
    historyEl.innerHTML = '<p class="empty-state">No ' + (modeToDisplay === 'build' ? 'projects' : 'chats') + ' yet</p>';
    return;
  }

  historyEl.innerHTML = items.map(function (item) {
    var title = 'New ' + itemType;
    if (item.messages && item.messages.length > 0) {
      var firstMsg = item.messages[0];
      title = firstMsg.text || firstMsg.content || title;
    } else {
      title = item.description || item.name || title;
    }

    var dateStr = new Date(item.createdAt || item.id || Date.now()).toLocaleDateString();
    var clickHandler = itemType === 'project'
      ? 'loadProject(' + item.id + ')'
      : 'loadChatHistory(' + item.id + ", '" + modeToDisplay + "')";

    return '<div class="history-item" onclick="' + clickHandler + '">' +
      '<div class="history-item-content">' +
      '<div class="history-item-title">' + escapeHtml(title.substring(0, 30)) + (title.length > 30 ? '...' : '') + '</div>' +
      '<div class="history-item-date">' + dateStr + '</div>' +
      '</div>' +
      '<button class="history-menu-btn" onclick="event.stopPropagation(); toggleContextMenu(this, \'' + itemType + "', " + item.id + ')">⋯</button>' +
      '<div class="context-menu hidden">' +
      '<button class="context-menu-item" onclick="event.stopPropagation(); openRenameModal(\'' + itemType + "', " + item.id + ")\" >Rename</button>" +
      '<button class="context-menu-item" onclick="event.stopPropagation(); hideItem(\'' + itemType + "', " + item.id + ')">Hide</button>' +
      '<button class="context-menu-item delete" onclick="event.stopPropagation(); deleteChat(\'' + itemType + "', " + item.id + ", '" + modeToDisplay + "')\" >Delete</button>" +
      '</div></div>';
  }).join('');
}

function updateChatPreview() {
  var container = document.getElementById('previewContainer');
  if (!container) return;

  if (!appState.currentChat || !appState.currentChat.messages || appState.currentChat.messages.length === 0) {
    container.innerHTML = '<div class="preview-placeholder"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z""")/>><circle cx="12" cy="12" r="3""")/>></svg><p>Your website preview will appear here</p></div>';
    return;
  }

  if (appState.currentMode === 'build') {
    renderWebsitePreviewSummary();
  } else {
    var msgs = appState.currentChat.messages;
    var lastUser = msgs.slice().reverse().find(function (m) { return m.sender === 'user'; });
    var messageText = lastUser ? (lastUser.text || lastUser.content || "") : "";
    var trunc = messageText.length > 100 ? messageText.substring(0, 100) + '...' : messageText;

    container.innerHTML = `
        <div class="chat-preview">
            <div class="chat-preview-item">
                <div class="chat-preview-label">Last Message</div>
                <div class="chat-preview-text">${escapeHtml(trunc)}</div>
            </div>
            <div class="chat-preview-item">
                <div class="chat-preview-label">Status</div>
                <div class="chat-preview-text">AI Assistant Active ✅</div>
            </div>
        </div>`;
  }
}

function toggleContextMenu(btn, type, id) {
  var menu = btn.nextElementSibling;
  document.querySelectorAll('.context-menu').forEach(function (m) {
    if (m !== menu) m.classList.add('hidden');
  });
  menu.classList.toggle('hidden');
}

function deleteChat(type, id, chatType) {
  if (type === 'project') {
    appState.projects = appState.projects.filter(function (p) { return p.id !== id; });
    saveProjectsToStorage();
    appState.hiddenProjects = appState.hiddenProjects.filter(function (pid) { return pid !== id; });
    saveHiddenProjectsToStorage();
    updateChatHistory('build');
  } else if (type === 'chat') {
    if (chatType === 'tech') {
      appState.techChats = appState.techChats.filter(function (c) { return c.id !== id; });
      saveChatsToStorage('tech');
    }
    appState.hiddenChats = appState.hiddenChats.filter(function (cid) { return cid !== id; });
    saveHiddenChatsToStorage();
    updateChatHistory(chatType || 'tech');
  }
}

function hideItem(type, id) {
  if (type === 'project') {
    if (!appState.hiddenProjects.includes(id)) {
      appState.hiddenProjects.push(id);
      saveHiddenProjectsToStorage();
    }
  } else {
    if (!appState.hiddenChats.includes(id)) {
      appState.hiddenChats.push(id);
      saveHiddenChatsToStorage();
    }
  }
  updateChatHistory(appState.currentMode);
}

function openRenameModal(type, id) {
  document.querySelectorAll('.context-menu').forEach(function (m) { m.classList.add('hidden'); });
  var currentName = '';
  if (type === 'project') {
    var p = appState.projects.find(function (p) { return p.id === id; });
    currentName = p ? p.name : '';
  } else {
    var c = appState.techChats.find(function (c) { return c.id === id; });
    currentName = c ? c.name : '';
  }

  var modal = document.createElement('div');
  modal.className = 'rename-modal';
  modal.innerHTML = '<div class="rename-modal-content"><h3>Rename ' + (type === 'project' ? 'Project' : 'Chat') + '</h3><input type="text" id="renameInput" class="rename-input" value="' + escapeHtml(currentName) + '" placeholder="Enter new name"><div class="rename-modal-buttons"><button class="rename-btn ok-btn" id="confirmRenameBtn">OK</button><button class="rename-btn cancel-btn" id="cancelRenameBtn">Cancel</button></div></div>';
  document.body.appendChild(modal);

  var inp = document.getElementById('renameInput');
  inp.focus();
  inp.select();

  document.getElementById('confirmRenameBtn').addEventListener('click', function () {
    var newName = inp.value.trim();
    if (newName) {
      if (type === 'project') {
        var proj = appState.projects.find(function (p) { return p.id === id; });
        if (proj) { proj.name = newName; saveProjectsToStorage(); }
      } else {
        var chat = appState.techChats.find(function (c) { return c.id === id; });
        if (chat) { chat.name = newName; saveChatsToStorage('tech'); }
      }
      updateChatHistory(appState.currentMode);
    }
    modal.remove();
  });

  document.getElementById('cancelRenameBtn').addEventListener('click', function () { modal.remove(); });
  inp.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') document.getElementById('confirmRenameBtn').click();
    if (e.key === 'Escape') modal.remove();
  });
}

function loadProject(projectId) {
  var project = appState.projects.find(function (p) { return p.id === projectId; });
  if (!project) return;

  appState.activeBuildProjectId = projectId;
  localStorage.setItem('Jemrox_active_project', JSON.stringify(projectId));

  document.getElementById('editorContent').style.display = 'none';
  document.getElementById('chatContainer').classList.remove('hidden');

  var chatMessages = document.getElementById('chatMessages');
  chatMessages.innerHTML = '';

  if (project.messages && project.messages.length > 0) {
    project.messages.forEach(function (msg) {
      var div = document.createElement('div');
      div.className = 'chat-message ' + msg.sender;
      var html = '<div class="message-content ' + msg.sender + '">' + (msg.sender === 'ai' ? formatMessage(msg.text) : escapeHtml(msg.text));
      if (msg.attachedFiles && msg.attachedFiles.length > 0) {
        html += '<div class="attached-files-display">';
        msg.attachedFiles.forEach(function (file) {
          if (file.type === 'image') html += '<img src="' + file.dataUrl + '" alt="' + file.name + '" class="message-attachment-image">';
          else html += '<div class="message-attachment-file">' + file.name + '</div>';
        });
        html += '</div>';
      }
      html += '</div>';
      div.innerHTML = html;
      chatMessages.appendChild(div);
    });
  }

  autoScrollToLatestMessage();

  if (project.webCode) {
    if (typeof updateFileSidebar === "function") updateFileSidebar(project.webCode);
    if (typeof renderWebsite === "function") renderWebsite(project.webCode.html, project.webCode.css, project.webCode.js);
    if (typeof openCodeEditorPanel === "function") openCodeEditorPanel();
  } else {
    if (typeof closeCodeEditorPanel === "function") closeCodeEditorPanel();
  }
}

function loadChatHistory(chatId, chatType) {
  var arr = chatType === 'tech' ? appState.techChats : appState.buildChats;
  var chat = arr.find(function (c) { return c.id === chatId; });
  if (!chat) return;

  chat = reconstructChat(chat);
  appState.currentChat = chat;
  appState.currentMode = chatType;
  localStorage.setItem('Jemrox_current_mode', chatType);

  if (chatType === 'tech') {
    appState.currentTechChatId = chatId;
    document.getElementById('editorContent').style.display = 'none';
    document.getElementById('chatContainer').classList.remove('hidden');
  }

  document.querySelectorAll('.mode-btn').forEach(function (btn) {
    btn.classList.remove('active');
    if (btn.dataset.mode === chatType) btn.classList.add('active');
  });

  var mainInput = document.getElementById('mainInput');
  mainInput.value = '';
  mainInput.placeholder = chatType === 'build' ? 'Describe the website you want to build...' : 'Ask me anything about tech...';

  loadChatMessages(chat);
}

function updatePreview(device) {
  var container = document.getElementById('previewContainer');
  var widths = { mobile: '375px', tablet: '768px', desktop: '100%' };
  container.style.maxWidth = widths[device] || '100%';
}

function toggleUploadMenu() {
  document.getElementById('uploadMenu').classList.toggle('hidden');
}

function handleUpload(type) {
  var input = document.createElement('input');
  input.type = 'file';
  if (type === 'image') input.accept = 'image/*';
  else if (type === 'video') input.accept = 'video/*';
  else if (type === 'document') input.accept = '.pdf,.doc,.docx';

  input.onchange = function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (ev) {
      var fileData = {
        id: Date.now(),
        name: file.name,
        type: type,
        size: file.size,
        uploadedAt: new Date().toLocaleString(),
        dataUrl: ev.target.result
      };
      appState.attachedFiles = appState.attachedFiles || [];
      appState.attachedFiles.push(fileData);
      updateAttachmentsDisplay();
      showToast(file.name + ' attached');
    };
    reader.readAsDataURL(file);
  };
  input.click();
  document.getElementById('uploadMenu').classList.add('hidden');
}

function updateAttachmentsDisplay() {
  var container = document.getElementById('attachmentsContainer');
  var list = document.getElementById('attachmentsList');
  var files = appState.attachedFiles || [];

  if (files.length === 0) {
    container.classList.add('hidden');
    list.innerHTML = '';
    return;
  }

  container.classList.remove('hidden');
  list.innerHTML = files.map(function (file, i) {
    var html = '<div class="attachment-item">';
    if (file.type === 'image') {
      html += '<img src="' + file.dataUrl + '" alt="' + file.name + '" class="attachment-thumbnail">';
    } else {
      html += '<div class="attachment-thumbnail" style="display:flex;align-items:center;justify-content:center;background:var(--bg-card);font-size:18px;color:var(--text-muted);">';
      html += '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>';
      html += '</div>';
    }
    html += '<button class="attachment-remove" onclick="removeAttachedFile(' + i + ')">x</button>';
    html += '</div>';
    return html;
  }).join('');
}

function removeAttachedFile(index) {
  appState.attachedFiles = appState.attachedFiles.filter(function (_, i) { return i !== index; });
  updateAttachmentsDisplay();
}

function clearAttachedFiles() {
  appState.attachedFiles = [];
  updateAttachmentsDisplay();
}

function openCodeEditorPanel() {
  var panel = document.getElementById('codeEditorPanel');
  panel.classList.remove('hidden');
  panel.classList.add('visible');
  updateCodeEditorFilesList();
  if (codeEditorState.currentTab && codeEditorState.currentCode[codeEditorState.currentTab]) {
    updateCodeEditorContent(codeEditorState.currentTab);
  }
  onEditorOpen();
}

function closeCodeEditorPanel() {
  var panel = document.getElementById('codeEditorPanel');
  panel.classList.remove('visible');
  panel.classList.add('hidden');
  var textarea = document.getElementById('codeEditorTextarea');
  if (textarea && codeEditorState.currentTab) {
    codeEditorState.currentCode[codeEditorState.currentTab] = textarea.value;
    localStorage.setItem('Jemrox_code_editor_state', JSON.stringify(codeEditorState));
  }
  onEditorClose();
}

function updateCodeEditorFilesList() {
  var list = document.getElementById('codeEditorFilesList');
  if (!list) return;
  var files = Object.keys(codeEditorState.currentCode);

  if (files.length === 0) {
    list.innerHTML = '<div style="padding:1rem;color:var(--text-muted);font-size:13px;">No files generated yet. Try building a website first!</div>';
    return;
  }

  var html = '';
  files.forEach(function (name) {
    var isActive = name === codeEditorState.currentTab;
    html += '<button class="code-editor-file-item ' + (isActive ? 'active' : '') + '" onclick="switchCodeEditorFile(\'' + name + '\')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' + name + '</button>';
  });
  list.innerHTML = html;
}

function switchCodeEditorFile(name) {
  codeEditorState.currentTab = name;
  updateCodeEditorContent(name);
  updateCodeEditorFilesList();
}

function updateCodeEditorContent(name) {
  var code = codeEditorState.currentCode[name] || '';
  var textarea = document.getElementById('codeEditorTextarea');
  var highlighter = document.getElementById('highlightedCode');
  var fileNameEl = document.getElementById('currentFileName');

  if (fileNameEl) fileNameEl.textContent = name;
  if (textarea) textarea.value = code;

  var escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  var highlighted = highlightCode(escaped);
  if (highlighter) highlighter.innerHTML = highlighted;
}

function highlightCode(code) {
  var h = code;
  h = h.replace(/\b(function|const|let|var|if|else|for|while|return|class|import|export|async|await|try|catch|new|this|super|extends|static)\b/g, '<span class="hljs-keyword">$1</span>');
  h = h.replace(/\b(break|continue|switch|case|default|do|throw|finally|yield)\b/g, '<span class="hljs-operator">$1</span>');
  h = h.replace(/(['"`])(.*?)\1/g, '<span class="hljs-string">$1$2$1</span>');
  h = h.replace(/\b(\d+\.?\d*)\b/g, '<span class="hljs-number">$1</span>');
  h = h.replace(/\b(true|false|null|undefined|NaN)\b/g, '<span class="hljs-attr">$1</span>');
  h = h.replace(/(\/\/.*?)$/gm, '<span class="hljs-comment">$1</span>');
  h = h.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="hljs-comment">$1</span>');
  h = h.replace(/\b(console|document|window|parseInt|Object|Array|String|Number|Math|Date|JSON)\b/g, '<span class="hljs-builtin">$1</span>');
  return h;
}

function switchCodeEditorView(view) {
  codeEditorState.currentView = view;

  var codeViewBtn = document.getElementById('codeViewBtn');
  var previewViewBtn = document.getElementById('previewViewBtn');
  var codeView = document.getElementById('codeView');
  var previewView = document.getElementById('previewView');

  codeViewBtn.classList.remove('active');
  previewViewBtn.classList.remove('active');
  codeView.classList.remove('active');
  previewView.classList.remove('active');

  if (view === 'code') {
    codeViewBtn.classList.add('active');
    codeView.classList.add('active');
  } else if (view === 'preview') {
    previewViewBtn.classList.add('active');
    previewView.classList.add('active');
  }

  localStorage.setItem('Jemrox_code_editor_view', view);
}

function downloadProject() {
  showToast('Download feature will be available once backend generates your project files.');
}

function copyCodeToClipboard() {
  var textarea = document.getElementById('codeEditorTextarea');
  navigator.clipboard.writeText(textarea.value).then(function () {
    showToast('Code copied!');
  });
}

function addNewFile() {
  var list = document.getElementById('codeEditorFilesList');
  var container = document.createElement('div');
  container.style.cssText = 'padding:8px;display:flex;gap:6px;';
  var input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'filename.ext';
  input.style.cssText = 'flex:1;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-input);color:var(--text);font-size:12px;outline:none;font-family:var(--font);';

  var okBtn = document.createElement('button');
  okBtn.textContent = 'Add';
  okBtn.style.cssText = 'padding:6px 12px;background:var(--accent);color:#09090b;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;';

  var cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'X';
  cancelBtn.style.cssText = 'padding:6px 10px;background:var(--bg-card);color:var(--text-muted);border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:12px;';

  var save = function () {
    var name = input.value.trim();
    if (!name) return;
    codeEditorState.currentCode[name] = '// ' + name + '\n';
    codeEditorState.currentTab = name;
    updateCodeEditorFilesList();
    updateCodeEditorContent(name);
    container.remove();
  };

  okBtn.addEventListener('click', save);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') save();
    if (e.key === 'Escape') container.remove();
  });
  cancelBtn.addEventListener('click', function () { container.remove(); });

  container.appendChild(input);
  container.appendChild(okBtn);
  container.appendChild(cancelBtn);
  list.insertBefore(container, list.firstChild);
  input.focus();
}

function addNewFolder() {
  var list = document.getElementById('codeEditorFilesList');
  var container = document.createElement('div');
  container.style.cssText = 'padding:8px;display:flex;gap:6px;';
  var input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'folder-name';
  input.style.cssText = 'flex:1;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-input);color:var(--text);font-size:12px;outline:none;font-family:var(--font);';

  var okBtn = document.createElement('button');
  okBtn.textContent = 'Add';
  okBtn.style.cssText = 'padding:6px 12px;background:var(--accent);color:#09090b;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;';

  var cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'X';
  cancelBtn.style.cssText = 'padding:6px 10px;background:var(--bg-card);color:var(--text-muted);border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:12px;';

  var save = function () {
    var name = input.value.trim();
    if (!name) return;
    codeEditorState.currentCode[name + '/.placeholder'] = '';
    updateCodeEditorFilesList();
    container.remove();
    showToast('Folder "' + name + '" created');
  };

  okBtn.addEventListener('click', save);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') save();
    if (e.key === 'Escape') container.remove();
  });
  cancelBtn.addEventListener('click', function () { container.remove(); });

  container.appendChild(input);
  container.appendChild(okBtn);
  container.appendChild(cancelBtn);
  list.insertBefore(container, list.firstChild);
  input.focus();
}

function openBuildChat(projectId) {
  var chatMessages = document.getElementById('chatMessages');

  if (!projectId) {
    if (chatMessages) chatMessages.innerHTML = '';
    return;
  }

  var project = appState.projects.find(function (p) { return p.id === projectId; });
  if (!project) return;

  // ⚡ FIXED: Added safe existence validation before mutating style objects
  var editorContent = document.getElementById('editorContent');
  if (editorContent) {
    editorContent.style.display = 'none';
  }

  // ⚡ FIXED: Added verification layer before processing class Lists
  var chatContainer = document.getElementById('chatContainer');
  if (chatContainer) {
    chatContainer.classList.remove('hidden');
  }

  if (chatMessages) {
    chatMessages.innerHTML = '';
    if (project.messages && project.messages.length > 0) {
      project.messages.forEach(function (msg) {
        var div = document.createElement('div');
        div.className = 'chat-message ' + msg.sender;
        var html = '<div class="message-content ' + msg.sender + '">' + (msg.sender === 'ai' ? formatMessage(msg.text) : escapeHtml(msg.text));
        if (msg.attachedFiles && msg.attachedFiles.length > 0) {
          html += '<div class="attached-files-display">';
          msg.attachedFiles.forEach(function (file) {
            if (file.type === 'image') html += '<img src="' + file.dataUrl + '" alt="' + file.name + '" class="message-attachment-image">';
            else html += '<div class="message-attachment-file">' + file.name + '</div>';
          });
          html += '</div>';
        }
        html += '</div>';
        div.innerHTML = html;
        chatMessages.appendChild(div);
      });
    }
  }
  autoScrollToLatestMessage();
}



async function sendToBackend(description) {
  const token = localStorage.getItem('token');
  const requestBody = {
    content: String(description || ""),
    chat_id: String(appState.activeBuildProjectId || Date.now()),
    mode: "build",
    user_id: appState.currentUser && appState.currentUser.id ? parseInt(appState.currentUser.id) : 0
  };

  try {
    const response = await fetch("https://jemrox-ai-project.vercel.app/chat/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify(requestBody)
    });
    if (response.ok) return await response.json();
    return null;
  } catch (error) { return null; }
}

function updateFileSidebar(webCode) {
  const fileList = document.getElementById('codeEditorFilesList');

  fileList.innerHTML = `
        <div class="file-item active" onclick="openFileInEditor('index.html')"><span>🌐</span> index.html</div>
        <div class="file-item" onclick="openFileInEditor('style.css')"><span>🎨</span> style.css</div>
        <div class="file-item" onclick="openFileInEditor('script.js')"><span>📜</span> script.js</div>
    `;
  appState.currentProjectCode = webCode;
  openFileInEditor('index.html');
}

// =====================================================================
// 🧽 1. ADVANCED ESCAPED MARKUP NORMALIZATION UTILITY
// =====================================================================
function normalizeEscapedMarkup(value) {
  if (typeof value !== 'string') return '';

  return value
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\');
}

// =====================================================================
// 🧼 2. ADVANCED SANITIZER ENGINE FOR AI LAYOUT GENERATION
// =====================================================================
function sanitizeGeneratedHtml(markup) {
  if (!markup || typeof markup !== 'string') return '';

  let sanitized = normalizeEscapedMarkup(markup);

  // Remove template-literal placeholder URLs that are not valid browser resources
  // e.g. src="${l.image}" or src="${s.image}" to fully prevent local file system blocks
  sanitized = sanitized.replace(/\b(?:src|href)\s*=\s*["']?\$\{[^}"']+["']?/gi, '');
  sanitized = sanitized.replace(/url\(\s*["']?\$\{[^)]+\}["']?\s*\)/gi, 'url()');
  sanitized = sanitized.replace(/\$\{[^}]+\}/g, '');

  // Strip broken duplicate Tailwind link tags if AI output injected them
  sanitized = sanitized.replace(/<link[^>]*href=["']?.*tailwind(?:.*\.css)?["']?[^>]*>/gi, '');

  return sanitized;
}

// =====================================================================
// 📜 3. LOCAL FILE EDITOR COMPONENT ROUTING
// =====================================================================
function openFileInEditor(fileName) {
  if (!appState.currentProjectCode) return;

  let rawCode = "";
  if (fileName === 'index.html') rawCode = appState.currentProjectCode.html;
  else if (fileName === 'style.css') rawCode = appState.currentProjectCode.css;
  else if (fileName === 'script.js') rawCode = appState.currentProjectCode.js;

  const textarea = document.getElementById('codeEditorTextarea');

  if (textarea) {
    textarea.value = rawCode;
    textarea.style.whiteSpace = "pre";
    textarea.dispatchEvent(new Event('input'));
  }
}

// =====================================================================
// 🏎️ 4. LIVE SANDBOX COMPILER ENGINE (FIXED CDN INJECTION RUNTIME)
// =====================================================================
function renderWebsite(html, css, js) {
  // ⚡ SELECTION: Target your authentic container references present in index.html
  const targets = [
    document.getElementById('previewView'),
    document.getElementById('previewContainer'),
    document.getElementById('preview-sandbox')
  ].filter(Boolean); // Filters out any unrendered null slots safely

  let cleanedHtml = sanitizeGeneratedHtml(html || '');

  targets.forEach(function (container) {
    if (!container) return;

    let iframe;
    if (container.tagName.toLowerCase() === 'iframe') {
      iframe = container;
    } else {
      container.innerHTML = '';
      iframe = document.createElement('iframe');
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.border = "none";
      iframe.style.background = "#0b0f19";
      iframe.title = "Jemrox Active Sandboxed Preview Engine";
      container.appendChild(iframe);
    }

    const safeJsCode = sanitizeGeneratedHtml(js || '');
    const safeCssCode = sanitizeGeneratedHtml(css || '');

    // ⚡ FIXED: Added explicit parameter query strings to quiet CDN telemetry exceptions
    const dynamicSourceDoc =
        '<!DOCTYPE html>\n' +
        '<html lang="en">\n' +
        '<head>\n' +
        '    <meta charset="UTF-8">\n' +
        '    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
        '    <!-- Official Standalone Tailwind CSS Play Engine with Production configurations -->\n' +
        '    <script src="https://tailwindcss.com"><\/script>\n' +
        '    <style>\n' +
        '        ' + safeCssCode + '\n' +
        '    </style>\n' +
        '</head>\n' +
        '<body class="bg-[#0b0f19] min-h-screen text-gray-100 p-6 flex flex-col items-center justify-start overflow-y-auto">\n' +
        '    ' + cleanedHtml + '\n' +
        '    <script>\n' +
        '        try {\n' +
        '            ' + safeJsCode + '\n' +
        '        } catch (sandboxException) {\n' +
        '            console.error("Runtime component failure inside Jemrox Sandbox:", sandboxException);\n' +
        '        }\n' +
        '    <\/script>\n' +
        '</body>\n' +
        '</html>';

    iframe.srcdoc = dynamicSourceDoc;
  });
}
