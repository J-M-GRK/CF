// CCFOLIA Log Converter Web App Logic
(function() {
  // --- APPLICATION STATE ---
  let state = {
    parsedLogs: [],
    uniqueTabs: [],
    uniqueCharacters: [],  // List of unique character names from the log
    selectedTheme: 'default',
    showIcons: true,
    blogHeader: false,
    tabColors: {},         // Map of tabName -> color hex
    charSettings: {},      // Map of charName -> { color: hex, avatar: url }
    narrators: [],         // Array of character names that are narrators
    fontSetting: { type: 'none', family: '', importUrl: '', fontFaceCSS: '' },
    editMode: false,
    fileName: '',
    rangeSelectMode: false,
    startIdx: null,
    endIdx: null,
    importMode: 'url',     // 'url' or 'file'
    apiToken: '',
    roomUrl: ''
  };

  // --- LOCAL STORAGE HELPERS ---
  const CONFIG_KEYS = {
    theme: 'cclog_theme',
    showIcons: 'cclog_show_icons',
    blogHeader: 'cclog_blog_header',
    charSettings: 'cclog_char_settings',
    tabColors: 'cclog_tab_colors',
    narrators: 'cclog_narrators',
    fontSetting: 'cclog_font_setting',
    siteTheme: 'cclog_site_theme',
    apiToken: 'cclog_ccfolia_token',
    lastUrl: 'cclog_last_room_url'
  };

  function loadSettings() {
    state.selectedTheme = localStorage.getItem(CONFIG_KEYS.theme) || 'default';
    
    const showIconsVal = localStorage.getItem(CONFIG_KEYS.showIcons);
    state.showIcons = showIconsVal !== null ? showIconsVal === 'true' : true;
    
    state.blogHeader = localStorage.getItem(CONFIG_KEYS.blogHeader) === 'true';
    
    try {
      state.charSettings = JSON.parse(localStorage.getItem(CONFIG_KEYS.charSettings)) || {};
      for (const name in state.charSettings) {
        if (state.charSettings[name].avatar && !state.charSettings[name]._manual) {
          delete state.charSettings[name].avatar;
        }
      }
    } catch(e) { state.charSettings = {}; }
    
    try {
      state.tabColors = JSON.parse(localStorage.getItem(CONFIG_KEYS.tabColors)) || {};
    } catch(e) { state.tabColors = {}; }
    
    try {
      state.narrators = JSON.parse(localStorage.getItem(CONFIG_KEYS.narrators)) || [];
    } catch(e) { state.narrators = []; }
    
    try {
      state.fontSetting = JSON.parse(localStorage.getItem(CONFIG_KEYS.fontSetting)) || { type: 'none', family: '', importUrl: '', fontFaceCSS: '' };
    } catch(e) {
      state.fontSetting = { type: 'none', family: '', importUrl: '', fontFaceCSS: '' };
    }

    state.apiToken = localStorage.getItem(CONFIG_KEYS.apiToken) || '';
    state.roomUrl = localStorage.getItem(CONFIG_KEYS.lastUrl) || '';
  }

  function saveSettings() {
    localStorage.setItem(CONFIG_KEYS.theme, state.selectedTheme);
    localStorage.setItem(CONFIG_KEYS.showIcons, state.showIcons);
    localStorage.setItem(CONFIG_KEYS.blogHeader, state.blogHeader);
    localStorage.setItem(CONFIG_KEYS.charSettings, JSON.stringify(state.charSettings));
    localStorage.setItem(CONFIG_KEYS.tabColors, JSON.stringify(state.tabColors));
    localStorage.setItem(CONFIG_KEYS.narrators, JSON.stringify(state.narrators));
    localStorage.setItem(CONFIG_KEYS.fontSetting, JSON.stringify(state.fontSetting));

    const saveTokenCheck = document.getElementById('apiTokenSaveCheck');
    if (!saveTokenCheck || saveTokenCheck.checked) {
      if (state.apiToken) localStorage.setItem(CONFIG_KEYS.apiToken, state.apiToken);
    } else {
      localStorage.removeItem(CONFIG_KEYS.apiToken);
    }

    if (state.roomUrl) {
      localStorage.setItem(CONFIG_KEYS.lastUrl, state.roomUrl);
    }
  }

  // --- THEME DATA DEFINITIONS ---
  const THEMES = [
    { value: 'default',    label: '기본 (다크)',     bg: '#1e1e1e', info: '#3A3F52', other: '#4a4a4a' },
    { value: 'light',      label: '라이트',          bg: '#f5f6fa', info: '#f0f8ff', other: '#e0e0e0' },
    { value: 'blackred',   label: '검정-빨강',       bg: '#0d0d0d', info: '#880000', other: '#2a2a2a' },
    { value: 'darkgreen',  label: '다크그린',        bg: '#0a1910', info: '#143623', other: '#111111' },
    { value: 'darkblue',   label: '다크블루',        bg: '#0a1019', info: '#141e36', other: '#111111' },
    { value: 'sf',         label: 'SF (사이버펑크)', bg: '#050510', info: '#001a1a', other: '#0d0d18' },
    { value: 'transdark',  label: '반투명 다크',     bg: '#1e1e1e', info: '#3a3f52', other: '#4a4a4a' },
    { value: 'translight', label: '반투명 라이트',   bg: '#f5f6fa', info: '#f0f8ff', other: '#e0e0e0' },
    { value: 'wedding',    label: '웨딩',            bg: '#FFF4EA', info: '#BF4646', other: '#7EACB5' },
    { value: 'void',       label: 'VOID',            bg: '#e6dd00', info: '#2f5d70', other: '#2f5d70' },
    { value: 'suibokuga',  label: '베이지',          bg: '#f7f4ef', info: '#e8e0d5', other: '#ede8e0' },
    { value: 'terminal',   label: '터미널',          bg: '#0d0d0d', info: '#0a2a0a', other: '#111' },
    { value: 'pink',       label: '핑크',            bg: '#fff0f5', info: '#ffb6c1', other: '#ffe4ec' },
    { value: 'pastel',     label: '파스텔',          bg: '#f9f5ff', info: '#e8d5fb', other: '#eef5ff' },
  ];

  const SYSTEM_FONTS = [
    { label: '맑은 고딕 (기본)', value: "'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif" },
    { label: '나눔고딕',         value: "'Nanum Gothic', sans-serif" },
    { label: '나눔명조',         value: "'Nanum Myeongjo', serif" },
    { label: 'Georgia (영문 세리프)', value: "Georgia, 'Times New Roman', serif" },
    { label: 'Courier New (고정폭)', value: "'Courier New', Consolas, monospace" },
  ];

  // Helper to escape HTML characters
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Helper to normalize tab names to standard names
  function normalizeTabName(tab) {
    if (!tab) return '메인';
    const t = tab.trim().toLowerCase();
    if (t === 'main' || t === '메인' || t === 'メイン') return '메인';
    if (t === 'zatsudan' || t === '잡담' || t === 'other' || t === '雑談') return '잡담';
    return tab.trim();
  }

  // Helper to convert rgb(...) or common color names to Hex (#rrggbb) for input[type="color"] compatibility
  function colorToHex(colorStr) {
    if (!colorStr) return '#ffffff';
    colorStr = colorStr.trim().toLowerCase();
    
    if (colorStr.startsWith('#')) {
      if (colorStr.length === 4) {
        return '#' + colorStr[1] + colorStr[1] + colorStr[2] + colorStr[2] + colorStr[3] + colorStr[3];
      }
      return colorStr;
    }
    
    const rgbMatch = colorStr.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*\d+(?:\.\d+)?)?\)$/i);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
      const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
      const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }
    
    const colors = {
      white: '#ffffff',
      black: '#000000',
      red: '#ff0000',
      green: '#00ff00',
      blue: '#0000ff'
    };
    return colors[colorStr] || '#ffffff';
  }

  // --- INITIALIZATION ---
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

  function initApp() {
    loadSettings();
    initializeUI();
    applySiteTheme();

    const urlParams = new URLSearchParams(window.location.search);
    const loadTestLogVal = urlParams.get('loadTestLog');
    if (loadTestLogVal) {
      const fileToFetch = loadTestLogVal === 'true' ? 'test_log.html' : loadTestLogVal;
      fetch(fileToFetch)
        .then(response => response.text())
        .then(text => {
          processLogHTML(text, fileToFetch);
        })
        .catch(err => console.error('Failed to load test log:', err));
    }
  }

  // --- SITE THEME MANAGER ---
  function applySiteTheme() {
    const siteTheme = localStorage.getItem(CONFIG_KEYS.siteTheme) || 'dark';
    if (siteTheme === 'light') {
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
      document.body.classList.add('dark-theme');
    }
  }



  // --- UI CONTROLLER & EVENT BINDINGS ---
  function initializeUI() {
    // Theme switch
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    themeToggleBtn.addEventListener('click', () => {
      if (document.body.classList.contains('dark-theme')) {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        localStorage.setItem(CONFIG_KEYS.siteTheme, 'light');
      } else {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        localStorage.setItem(CONFIG_KEYS.siteTheme, 'dark');
      }
    });

    // Import Mode Switcher (URL vs File)
    const tabModeUrl = document.getElementById('tabModeUrl');
    const tabModeFile = document.getElementById('tabModeFile');
    const urlImportPanel = document.getElementById('urlImportPanel');
    const fileImportPanel = document.getElementById('fileImportPanel');

    const switchImportMode = (mode) => {
      state.importMode = mode;
      if (mode === 'url') {
        tabModeUrl?.classList.add('active');
        tabModeFile?.classList.remove('active');
        if (urlImportPanel) urlImportPanel.style.display = 'block';
        if (fileImportPanel) fileImportPanel.style.display = 'none';
      } else {
        tabModeFile?.classList.add('active');
        tabModeUrl?.classList.remove('active');
        if (urlImportPanel) urlImportPanel.style.display = 'none';
        if (fileImportPanel) fileImportPanel.style.display = 'block';
      }
    };

    tabModeUrl?.addEventListener('click', () => switchImportMode('url'));
    tabModeFile?.addEventListener('click', () => switchImportMode('file'));

    // URL Import Controls
    const logUrlInput = document.getElementById('logUrlInput');
    const apiLoadBtn = document.getElementById('apiLoadBtn');
    const apiLoadBtnText = document.getElementById('apiLoadBtnText');
    const apiTokenInput = document.getElementById('apiTokenInput');
    const apiTokenSaveCheck = document.getElementById('apiTokenSaveCheck');
    const tokenToggleVisibilityBtn = document.getElementById('tokenToggleVisibilityBtn');

    if (logUrlInput && state.roomUrl) {
      logUrlInput.value = state.roomUrl;
    }
    if (apiTokenInput && state.apiToken) {
      apiTokenInput.value = state.apiToken;
    }

    logUrlInput?.addEventListener('input', (e) => {
      state.roomUrl = e.target.value.trim();
      saveSettings();
    });

    logUrlInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        apiLoadBtn?.click();
      }
    });

    apiTokenInput?.addEventListener('input', (e) => {
      state.apiToken = e.target.value.trim();
      saveSettings();
    });

    apiTokenSaveCheck?.addEventListener('change', () => {
      saveSettings();
    });

    tokenToggleVisibilityBtn?.addEventListener('click', () => {
      if (!apiTokenInput) return;
      if (apiTokenInput.type === 'password') {
        apiTokenInput.type = 'text';
        tokenToggleVisibilityBtn.textContent = '🔒';
      } else {
        apiTokenInput.type = 'password';
        tokenToggleVisibilityBtn.textContent = '👁️';
      }
    });

    // Token Help Modal
    const tokenHelpModal = document.getElementById('tokenHelpModal');
    const tokenHelpBtn = document.getElementById('tokenHelpBtn');
    const tokenHelpCloseBtn = document.getElementById('tokenHelpCloseBtn');
    const tokenHelpConfirmBtn = document.getElementById('tokenHelpConfirmBtn');
    const copyTokenScriptBtn = document.getElementById('copyTokenScriptBtn');
    const tokenScriptCode = document.getElementById('tokenScriptCode');

    const showTokenHelpModal = () => {
      if (tokenHelpModal) tokenHelpModal.style.display = 'flex';
    };
    const hideTokenHelpModal = () => {
      if (tokenHelpModal) tokenHelpModal.style.display = 'none';
    };

    tokenHelpBtn?.addEventListener('click', showTokenHelpModal);
    tokenHelpCloseBtn?.addEventListener('click', hideTokenHelpModal);
    tokenHelpConfirmBtn?.addEventListener('click', hideTokenHelpModal);
    tokenHelpModal?.addEventListener('click', (e) => {
      if (e.target === tokenHelpModal) hideTokenHelpModal();
    });

    copyTokenScriptBtn?.addEventListener('click', async () => {
      if (tokenScriptCode) {
        try {
          await navigator.clipboard.writeText(tokenScriptCode.value);
          showToast('추출 스크립트가 복사되었습니다! 코코포리아 콘솔에 붙여넣으세요.');
        } catch(e) {
          tokenScriptCode.select();
          document.execCommand('copy');
          showToast('스크립트가 복사되었습니다!');
        }
      }
    });

    // API Load Button Action
    apiLoadBtn?.addEventListener('click', async () => {
      const url = (logUrlInput?.value || '').trim();
      if (!url) {
        showToast('코코포리아 방 주소를 입력해주세요.');
        logUrlInput?.focus();
        return;
      }
      const roomId = extractRoomId(url);
      if (!roomId) {
        alert('올바른 코코포리아 방 주소 형식이 아닙니다.\n예: https://ccfolia.com/rooms/1234567890');
        return;
      }

      state.roomUrl = url;
      state.apiToken = (apiTokenInput?.value || '').trim();
      saveSettings();

      apiLoadBtn.disabled = true;
      const origText = apiLoadBtnText ? apiLoadBtnText.textContent : '불러오기';
      if (apiLoadBtnText) apiLoadBtnText.textContent = '가져오는 중...';

      try {
        const { logs, roomTitle, charactersMap } = await fetchLogsFromAPI(roomId, state.apiToken);
        if (logs && logs.length > 0) {
          const displayName = roomTitle ? `${roomTitle}.html` : `room_${roomId}.html`;
          setLoadedLogs(logs, displayName, 'api', charactersMap);
          showToast(`✅ ${logs.length.toLocaleString()}개 로그를 성공적으로 불러왔습니다!`);
        }
      } catch (err) {
        console.error('API Log Fetch Error:', err);
        if (err.message === 'AUTH_REQUIRED') {
          const tokenDetails = document.getElementById('tokenDetails');
          if (tokenDetails) tokenDetails.open = true;
          apiTokenInput?.focus();
          
          if (confirm('방에 접근할 권한이 없습니다 (비공개 방이거나 로그인 필요).\n코코포리아 인증 토큰을 설정해야 합니다.\n\n토큰을 쉽게 얻는 방법 안내를 확인하시겠습니까?')) {
            showTokenHelpModal();
          }
        } else {
          alert('로그 가져오기 실패:\n' + err.message);
        }
        updateStatus('가져오기 실패', 'muted');
      } finally {
        apiLoadBtn.disabled = false;
        if (apiLoadBtnText) apiLoadBtnText.textContent = origText;
      }
    });

    // File Input & Drag and Drop
    const fileInput = document.getElementById('logFileInput');
    const dropzone = document.getElementById('dropzone');
    const fileInfo = document.getElementById('fileInfo');
    const fileNameDisplay = document.getElementById('fileName');
    const fileRemoveBtn = document.getElementById('fileRemoveBtn');

    dropzone?.addEventListener('click', () => fileInput?.click());
    
    fileInput?.addEventListener('change', (e) => {
      handleFileSelect(e.target.files[0]);
    });

    // Drag-drop events
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone?.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('dragover');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone?.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
      }, false);
    });

    dropzone?.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const file = dt.files[0];
      handleFileSelect(file);
    });

    fileRemoveBtn?.addEventListener('click', () => {
      if (fileInput) fileInput.value = '';
      state.parsedLogs = [];
      state.uniqueTabs = [];
      state.uniqueCharacters = [];
      state.fileName = '';
      
      // Reset range selection
      state.rangeSelectMode = false;
      state.startIdx = null;
      state.endIdx = null;
      if (document.getElementById('rangeSelectModeToggle')) {
        document.getElementById('rangeSelectModeToggle').classList.remove('active');
      }
      if (document.getElementById('rangeSelectBanner')) {
        document.getElementById('rangeSelectBanner').style.display = 'none';
      }
      
      if (fileInfo) fileInfo.style.display = 'none';
      
      // Restore active import mode panel
      if (state.importMode === 'url') {
        if (urlImportPanel) urlImportPanel.style.display = 'block';
        if (fileImportPanel) fileImportPanel.style.display = 'none';
      } else {
        if (urlImportPanel) urlImportPanel.style.display = 'none';
        if (fileImportPanel) fileImportPanel.style.display = 'block';
      }
      
      const emptyState = document.getElementById('emptyState');
      if (emptyState) emptyState.style.display = 'flex';
      
      updateStatus('파일 없음', 'muted');
      renderTabColorList();
      renderCharSettingsList();
      renderNarratorList();
      clearPreviewFrame();
    });

    // Toggles & Selects
    const showIconsCheck = document.getElementById('showIconsCheck');
    showIconsCheck.checked = state.showIcons;
    showIconsCheck.addEventListener('change', (e) => {
      state.showIcons = e.target.checked;
      saveSettings();
      renderPreview();
    });

    const blogHeaderCheck = document.getElementById('blogHeaderCheck');
    blogHeaderCheck.checked = state.blogHeader;
    blogHeaderCheck.addEventListener('change', (e) => {
      state.blogHeader = e.target.checked;
      saveSettings();
      renderPreview();
    });

    // Themes Dropdown UI
    const themeDropdown = document.getElementById('themeDropdown');
    const themeDropdownBtn = document.getElementById('themeDropdownBtn');
    const themeDropdownLabel = document.getElementById('themeDropdownLabel');
    const themeDropdownMenu = document.getElementById('themeDropdownMenu');
    const logThemeSelect = document.getElementById('logThemeSelect');

    function makeSwatches(t) {
      return `<div class="theme-swatches">
        <span class="theme-swatch-circle" style="background:${t.bg}"></span>
        <span class="theme-swatch-circle" style="background:${t.info}"></span>
        <span class="theme-swatch-circle" style="background:${t.other}"></span>
      </div>`;
    }

    function renderThemeDropdown() {
      themeDropdownMenu.innerHTML = '';
      THEMES.forEach(t => {
        const option = document.createElement('div');
        option.className = 'select-option' + (state.selectedTheme === t.value ? ' active' : '');
        option.innerHTML = makeSwatches(t) + `<span>${t.label}</span>`;
        option.addEventListener('click', () => {
          state.selectedTheme = t.value;
          logThemeSelect.value = t.value;
          themeDropdownLabel.innerHTML = makeSwatches(t) + `<span>${t.label}</span>`;
          themeDropdownMenu.style.display = 'none';
          saveSettings();
          renderPreview();
        });
        themeDropdownMenu.appendChild(option);
      });
      
      const currentTheme = THEMES.find(t => t.value === state.selectedTheme) || THEMES[0];
      themeDropdownLabel.innerHTML = makeSwatches(currentTheme) + `<span>${currentTheme.label}</span>`;
      logThemeSelect.value = currentTheme.value;
    }

    renderThemeDropdown();

    themeDropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (document.getElementById('narratorDropdownMenu')) document.getElementById('narratorDropdownMenu').style.display = 'none';
      themeDropdownMenu.style.display = themeDropdownMenu.style.display === 'block' ? 'none' : 'block';
    });

    document.addEventListener('click', () => {
      themeDropdownMenu.style.display = 'none';
      if (document.getElementById('narratorDropdownMenu')) document.getElementById('narratorDropdownMenu').style.display = 'none';
    });



    renderCharSettingsList();

    // Narration Dropdown UI Bindings
    const narratorDropdownBtn = document.getElementById('narratorDropdownBtn');
    const narratorDropdownMenu = document.getElementById('narratorDropdownMenu');

    narratorDropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      themeDropdownMenu.style.display = 'none';
      if (document.getElementById('fontSystemDropdownMenu')) document.getElementById('fontSystemDropdownMenu').style.display = 'none';
      if (document.getElementById('fontWebDropdownMenu')) document.getElementById('fontWebDropdownMenu').style.display = 'none';
      
      narratorDropdownMenu.style.display = narratorDropdownMenu.style.display === 'block' ? 'none' : 'block';
    });

    narratorDropdownMenu.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    renderNarratorList();

    // Font selection panels & radios
    const fontRadios = document.querySelectorAll('input[name="fontType"]');
    const fontSystemPanel = document.getElementById('fontSystemPanel');
    const fontWebPanel = document.getElementById('fontWebPanel');
    
    // Set initial checked radio
    const activeRadio = document.getElementById(`fontType${state.fontSetting.type.charAt(0).toUpperCase() + state.fontSetting.type.slice(1)}`);
    if (activeRadio) activeRadio.checked = true;
    toggleFontPanels(state.fontSetting.type);

    fontRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        state.fontSetting.type = e.target.value;
        toggleFontPanels(e.target.value);
        saveFontSetting();
      });
    });

    function toggleFontPanels(type) {
      fontSystemPanel.style.display = type === 'system' ? 'block' : 'none';
      fontWebPanel.style.display = type === 'web' ? 'block' : 'none';
    }

    // System font drop-down
    const systemDropdownBtn = document.getElementById('fontSystemDropdownBtn');
    const systemDropdownMenu = document.getElementById('fontSystemDropdownMenu');
    const systemDropdownLabel = document.getElementById('fontSystemDropdownLabel');
    const systemSelect = document.getElementById('fontSystemSelect');

    function renderSystemFonts() {
      systemDropdownMenu.innerHTML = '';
      SYSTEM_FONTS.forEach(font => {
        const option = document.createElement('div');
        option.className = 'select-option' + (state.fontSetting.family === font.value ? ' active' : '');
        option.innerHTML = `<span>${font.label}</span>`;
        option.addEventListener('click', () => {
          state.fontSetting.family = font.value;
          systemSelect.value = font.value;
          systemDropdownLabel.textContent = font.label;
          systemDropdownMenu.style.display = 'none';
          saveFontSetting();
        });
        systemDropdownMenu.appendChild(option);
      });

      const current = SYSTEM_FONTS.find(f => f.value === state.fontSetting.family);
      systemDropdownLabel.textContent = current ? current.label : '맑은 고딕 (기본)';
    }

    renderSystemFonts();

    systemDropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      systemDropdownMenu.style.display = systemDropdownMenu.style.display === 'block' ? 'none' : 'block';
    });

    document.addEventListener('click', () => {
      systemDropdownMenu.style.display = 'none';
    });

    // Web font adding and selection logic
    const fontWebDropdownBtn = document.getElementById('fontWebDropdownBtn');
    const fontWebDropdownMenu = document.getElementById('fontWebDropdownMenu');
    const fontWebDropdownLabel = document.getElementById('fontWebDropdownLabel');
    
    let localWebFonts = [];
    try {
      localWebFonts = JSON.parse(localStorage.getItem('cclog_webfonts')) || [
        { family: 'Noto Sans KR', label: 'Noto Sans KR' },
        { family: 'Nanum Gothic', label: '나눔고딕' },
        { family: 'Nanum Myeongjo', label: '나눔명조' },
        { family: 'Gowun Dodum', label: '고운돋움' }
      ];
    } catch(e) {
      localWebFonts = [];
    }

    function renderWebFonts() {
      fontWebDropdownMenu.innerHTML = '';
      if (localWebFonts.length === 0) {
        fontWebDropdownMenu.innerHTML = '<div style="padding:8px 12px; font-size:12px; color:#888;">추가된 폰트가 없습니다.</div>';
      }
      localWebFonts.forEach(font => {
        const option = document.createElement('div');
        option.className = 'select-option' + (state.fontSetting.family === font.family ? ' active' : '');
        option.innerHTML = `<span style="flex:1;">${font.label || font.family}</span>
          <span class="delete-web-font" data-family="${font.family}" style="color:var(--danger); font-size:11px; padding:2px 4px;">✕</span>`;
        
        option.addEventListener('click', (e) => {
          if (e.target.classList.contains('delete-web-font')) {
            e.stopPropagation();
            localWebFonts = localWebFonts.filter(f => f.family !== font.family);
            localStorage.setItem('cclog_webfonts', JSON.stringify(localWebFonts));
            renderWebFonts();
            return;
          }
          state.fontSetting.family = font.family;
          state.fontSetting.importUrl = font.importUrl || '';
          state.fontSetting.fontFaceCSS = font.fontFaceCSS || '';
          fontWebDropdownLabel.textContent = font.label || font.family;
          fontWebDropdownMenu.style.display = 'none';
          saveFontSetting();
        });
        fontWebDropdownMenu.appendChild(option);
      });

      const current = localWebFonts.find(f => f.family === state.fontSetting.family);
      fontWebDropdownLabel.textContent = current ? (current.label || current.family) : '폰트를 선택하세요';
    }

    renderWebFonts();

    fontWebDropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fontWebDropdownMenu.style.display = fontWebDropdownMenu.style.display === 'block' ? 'none' : 'block';
    });

    document.addEventListener('click', () => {
      fontWebDropdownMenu.style.display = 'none';
    });

    // Save Custom Web Font
    const fontWebImportUrl = document.getElementById('fontWebImportUrl');
    const fontWebFamily = document.getElementById('fontWebFamily');
    const fontWebLabel = document.getElementById('fontWebLabel');
    const fontWebSaveBtn = document.getElementById('fontWebSaveBtn');

    fontWebImportUrl.addEventListener('input', () => {
      const val = fontWebImportUrl.value;
      const fontFaceMatch = val.match(/@font-face\s*\{[^}]*\}/si);
      if (fontFaceMatch) {
        const familyMatch = fontFaceMatch[0].match(/font-family\s*:\s*['"]([^'"]+)['"]/i)
                         || fontFaceMatch[0].match(/font-family\s*:\s*([^;'"]+?)\s*;/i);
        if (familyMatch) {
          fontWebFamily.value = familyMatch[1].trim();
        }
      }
    });

    fontWebSaveBtn.addEventListener('click', () => {
      const family = fontWebFamily.value.trim();
      const label = fontWebLabel.value.trim() || family;
      let importUrl = fontWebImportUrl.value.trim();

      if (!family) {
        showToast('폰트 Family 이름을 입력해 주세요.');
        return;
      }

      let fontFaceCSS = '';
      const fontFaceMatch = importUrl.match(/@font-face\s*\{[^}]*\}/si);
      if (fontFaceMatch) {
        fontFaceCSS = fontFaceMatch[0];
        importUrl = '';
      } else {
        const importMatch = importUrl.match(/@import\s+url\(['"']?(.*?)['"']?\)/i);
        if (importMatch) importUrl = importMatch[1].trim();
      }

      const newFont = { family, label, importUrl, fontFaceCSS };
      localWebFonts = localWebFonts.filter(f => f.family !== family);
      localWebFonts.push(newFont);
      localStorage.setItem('cclog_webfonts', JSON.stringify(localWebFonts));
      
      // Select newly added font
      state.fontSetting.family = family;
      state.fontSetting.importUrl = importUrl;
      state.fontSetting.fontFaceCSS = fontFaceCSS;
      saveFontSetting();
      
      fontWebFamily.value = '';
      fontWebLabel.value = '';
      fontWebImportUrl.value = '';
      
      renderWebFonts();
    });

    function saveFontSetting() {
      saveSettings();
      renderPreview();
    }

    // --- ACTIONS BUTTON BAR BINDINGS ---

    function getActiveLogs() {
      if (state.startIdx !== null && state.endIdx !== null) {
        return state.parsedLogs.slice(state.startIdx, state.endIdx + 1);
      }
      return state.parsedLogs;
    }

    const fileCopyBtn = document.getElementById('fileCopyBtn');
    fileCopyBtn.addEventListener('click', async () => {
      const activeLogs = getActiveLogs();
      if (activeLogs.length === 0) return showToast('업로드된 파일이 없습니다.');
      const htmlContent = generateHTMLCode(activeLogs, state.selectedTheme, state.showIcons, state.blogHeader, state.charSettings, state.tabColors, state.narrators, state.fontSetting);
      try {
        await navigator.clipboard.writeText(htmlContent);
        showToast(state.startIdx !== null && state.endIdx !== null ? '선택 범위의 HTML 코드가 복사되었습니다!' : 'HTML 코드가 복사되었습니다!');
      } catch (err) {
        showToast('복사 실패: ' + err);
      }
    });

    const fileDownloadBtn = document.getElementById('fileDownloadBtn');
    fileDownloadBtn.addEventListener('click', () => {
      const activeLogs = getActiveLogs();
      if (activeLogs.length === 0) return showToast('업로드된 파일이 없습니다.');
      const htmlContent = generateHTMLCode(activeLogs, state.selectedTheme, state.showIcons, state.blogHeader, state.charSettings, state.tabColors, state.narrators, state.fontSetting);
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      
      const isCut = state.startIdx !== null && state.endIdx !== null;
      link.download = state.fileName 
        ? (isCut ? 'cut_' : 'converted_') + state.fileName 
        : 'converted_log.html';
      link.click();
    });

    const fileAnalyzeBtn = document.getElementById('fileAnalyzeBtn');
    fileAnalyzeBtn.addEventListener('click', () => {
      const activeLogs = getActiveLogs();
      if (activeLogs.length === 0) return showToast('업로드된 파일이 없습니다.');
      const results = analyzeLogData(activeLogs);
      const analysisHTML = generateAnalysisHTML(results);
      const blob = new Blob([analysisHTML], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    });

    // --- RANGE SELECTION TOGGLE ---
    const rangeSelectModeToggle = document.getElementById('rangeSelectModeToggle');
    const rangeSelectBanner = document.getElementById('rangeSelectBanner');
    const rangeSelectResetBtn = document.getElementById('rangeSelectResetBtn');

    rangeSelectModeToggle.addEventListener('click', () => {
      if (state.parsedLogs.length === 0) return showToast('로그 파일이 존재하지 않습니다.');
      state.rangeSelectMode = !state.rangeSelectMode;

      if (state.rangeSelectMode) {
        rangeSelectModeToggle.classList.add('active');
        rangeSelectBanner.style.display = 'flex';
        updateStatus('범위 선택 중', 'editing');
        renderPreview();
      } else {
        rangeSelectModeToggle.classList.remove('active');
        rangeSelectBanner.style.display = 'none';
        updateStatus('변환 완료', 'active');
        renderPreview();
      }
    });

    rangeSelectResetBtn.addEventListener('click', () => {
      resetRangeSelection();
    });

  }

  // Toast Notification handler
  function showToast(msg) {
    const toast = document.getElementById('toastMsg');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  }

  // UI Status Dot indicator
  function updateStatus(text, type) {
    const dot = document.getElementById('statusDot');
    const textEl = document.getElementById('statusText');
    
    dot.className = 'status-dot';
    if (type) dot.classList.add(type);
    
    textEl.textContent = text;
  }

  // Dynamic listing UI for Character settings overrides
  function renderCharSettingsList() {
    const listContainer = document.getElementById('charSettingsList');
    listContainer.innerHTML = '';
    
    if (!state.uniqueCharacters || state.uniqueCharacters.length === 0) return;

    state.uniqueCharacters.forEach(name => {
      // Find the original color of this character from the parsed log
      const firstEntry = state.parsedLogs.find(log => log.name === name);
      const originalColor = firstEntry ? firstEntry.color : '#ffffff';
      
      const settings = state.charSettings[name] || {};
      const savedColor = colorToHex(settings.color || originalColor);
      const savedAvatar = settings.avatar || '';

      const item = document.createElement('div');
      item.style.cssText = 'display: flex; flex-direction: column; gap: 6px; padding: 10px; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 8px;';
      
      item.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
          <span style="font-weight: 600; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">${escapeHtml(name)}</span>
          <div style="display: flex; align-items: center; gap: 6px;">
            <input type="color" class="input-color char-color-picker" value="${savedColor}" title="텍스트 색상">
            <button class="list-item-btn char-reset-btn" style="font-size: 11px;">초기화</button>
          </div>
        </div>
        <input type="text" class="input-text char-avatar-input" style="font-size: 11px; padding: 6px 8px; width: 100%; box-sizing: border-box;" placeholder="프로필 이미지 URL (http...)" value="${escapeHtml(savedAvatar)}">
      `;
      
      const colorPicker = item.querySelector('.char-color-picker');
      const avatarInput = item.querySelector('.char-avatar-input');
      const resetBtn = item.querySelector('.char-reset-btn');

      const updateSettings = async () => {
        let avatarVal = avatarInput.value.trim();
        if (avatarVal && avatarVal.startsWith('http')) {
          avatarVal = await cropImageToSquare(avatarVal);
        }
        state.charSettings[name] = {
          color: colorPicker.value,
          avatar: avatarVal,
          _manual: !!avatarVal
        };
        saveSettings();
        renderPreview();
      };

      colorPicker.addEventListener('change', updateSettings);
      avatarInput.addEventListener('change', updateSettings);
      avatarInput.addEventListener('input', updateSettings);

      resetBtn.addEventListener('click', () => {
        delete state.charSettings[name];
        saveSettings();
        colorPicker.value = colorToHex(originalColor);
        avatarInput.value = '';
        renderPreview();
      });
      
      listContainer.appendChild(item);
    });
  }

  // Dynamic listing UI for Tab background colors
  function renderTabColorList() {
    const container = document.getElementById('tabColorList');
    container.innerHTML = '';

    if (state.uniqueTabs.length === 0) return;

    state.uniqueTabs.forEach(tab => {
      const item = document.createElement('div');
      item.className = 'list-item';
      
      const savedColor = state.tabColors[tab] || '';
      
      item.innerHTML = `
        <span class="list-item-name" style="font-weight: 500;">${escapeHtml(tab)}</span>
        <input type="color" class="input-color tab-color-picker" value="${savedColor || '#252525'}" title="바탕색 지정">
        <button class="list-item-btn btn-reset" style="margin-left: 5px;">초기화</button>
      `;

      const picker = item.querySelector('.tab-color-picker');
      picker.addEventListener('change', (e) => {
        state.tabColors[tab] = e.target.value;
        saveSettings();
        renderPreview();
      });

      item.querySelector('.btn-reset').addEventListener('click', () => {
        delete state.tabColors[tab];
        picker.value = '#252525';
        saveSettings();
        renderPreview();
      });

      container.appendChild(item);
    });
  }

  function updateNarratorDropdownLabel() {
    const label = document.getElementById('narratorDropdownLabel');
    if (!label) return;
    if (state.narrators.length === 0) {
      label.textContent = '나레이션 선택...';
    } else {
      label.textContent = state.narrators.join(', ');
    }
  }

  // Dynamic listing UI for Narrator designation
  function renderNarratorList() {
    const listContainer = document.getElementById('narratorDropdownMenu');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    updateNarratorDropdownLabel();

    if (!state.uniqueCharacters || state.uniqueCharacters.length === 0) {
      listContainer.innerHTML = '<div style="padding:8px 12px; font-size:12px; color:#888;">캐릭터가 없습니다.</div>';
      return;
    }

    state.uniqueCharacters.forEach(name => {
      const isChecked = state.narrators.includes(name);
      
      const option = document.createElement('div');
      option.className = 'select-option' + (isChecked ? ' active' : '');
      option.style.cssText = 'padding: 8px 12px; display: flex; align-items: center; gap: 8px; cursor: pointer;';
      
      option.innerHTML = `
        <input type="checkbox" class="narrator-checkbox" ${isChecked ? 'checked' : ''} style="cursor: pointer; pointer-events: none;">
        <span style="font-weight: 500; font-size: 13px;">${escapeHtml(name)}</span>
      `;

      option.addEventListener('click', (e) => {
        const checkbox = option.querySelector('.narrator-checkbox');
        const checked = !checkbox.checked;
        checkbox.checked = checked;
        
        if (checked) {
          if (!state.narrators.includes(name)) {
            state.narrators.push(name);
          }
          option.classList.add('active');
        } else {
          state.narrators = state.narrators.filter(n => n !== name);
          option.classList.remove('active');
        }
        
        updateNarratorDropdownLabel();
        saveSettings();
        renderPreview();
      });

      listContainer.appendChild(option);
    });

    // Custom confirm modal listeners
    const confirmModal = document.getElementById('confirmModal');
    const modalCancelBtn = document.getElementById('modalCancelBtn');
    const modalConfirmBtn = document.getElementById('modalConfirmBtn');

    if (modalCancelBtn) {
      modalCancelBtn.addEventListener('click', () => {
        hideDeleteConfirmModal();
      });
    }

    if (modalConfirmBtn) {
      modalConfirmBtn.addEventListener('click', () => {
        if (pendingDeleteIdx !== null) {
          deleteLogEntry(pendingDeleteIdx);
        }
        hideDeleteConfirmModal();
      });
    }

    if (confirmModal) {
      confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) {
          hideDeleteConfirmModal();
        }
      });
    }
  }

  // --- LOADED LOGS STATE SYNCHRONIZATION ---
  function setLoadedLogs(logs, displayName, sourceType = 'file', charactersMap = {}) {
    state.fileName = displayName;
    state.parsedLogs = logs.filter(log => log.text && log.text.trim() !== '');
    
    // Reset range selection when a new log is loaded
    state.rangeSelectMode = false;
    state.startIdx = null;
    state.endIdx = null;
    const rToggle = document.getElementById('rangeSelectModeToggle');
    const rBanner = document.getElementById('rangeSelectBanner');
    if (rToggle) rToggle.classList.remove('active');
    if (rBanner) rBanner.style.display = 'none';

    // Extract Unique tabs
    const tabSet = new Set();
    state.parsedLogs.forEach(log => {
      if (log.tab && log.tab !== 'system') tabSet.add(log.tab);
    });
    state.uniqueTabs = Array.from(tabSet);

    // Extract Unique characters
    const charSet = new Set();
    state.parsedLogs.forEach(log => {
      if (log.name && log.name.toLowerCase() !== 'system') {
        charSet.add(log.name);
      }
    });
    state.uniqueCharacters = Array.from(charSet);

    // Auto-populate parsed colors to state.charSettings if not already defined (matches cocoroke)
    state.uniqueCharacters.forEach(name => {
      if (!state.charSettings[name]) {
        state.charSettings[name] = {};
      }
      
      // Clean up any stale auto-populated avatar from localStorage so per-chat images are not blocked
      if (state.charSettings[name].avatar && !state.charSettings[name]._manual) {
        delete state.charSettings[name].avatar;
      }
      
      // Auto-set color
      if (!state.charSettings[name].color) {
        if (charactersMap && charactersMap[name] && charactersMap[name].color) {
          state.charSettings[name].color = colorToHex(charactersMap[name].color);
        } else {
          const firstEntry = state.parsedLogs.find(log => log.name === name);
          if (firstEntry && firstEntry.color) {
            const parsedHex = colorToHex(firstEntry.color);
            if (parsedHex && parsedHex.toLowerCase() !== '#ffffff') {
              state.charSettings[name].color = parsedHex;
            }
          }
        }
      }
    });
    saveSettings();

    // UI feedback elements update
    const fileTypeBadge = document.getElementById('fileTypeBadge');
    if (fileTypeBadge) {
      fileTypeBadge.textContent = sourceType === 'api' ? '방 API' : 'HTML 파일';
    }
    const fileNameEl = document.getElementById('fileName');
    if (fileNameEl) {
      fileNameEl.textContent = displayName;
    }
    const logCountBadge = document.getElementById('logCountBadge');
    if (logCountBadge) {
      logCountBadge.textContent = `${state.parsedLogs.length.toLocaleString()}개`;
    }

    const fileInfo = document.getElementById('fileInfo');
    if (fileInfo) fileInfo.style.display = 'flex';
    const urlPanel = document.getElementById('urlImportPanel');
    if (urlPanel) urlPanel.style.display = 'none';
    const filePanel = document.getElementById('fileImportPanel');
    if (filePanel) filePanel.style.display = 'none';
    const emptyState = document.getElementById('emptyState');
    if (emptyState) emptyState.style.display = 'none';

    renderTabColorList();
    renderCharSettingsList();
    renderNarratorList();

    updateStatus('변환 완료', 'active');
    renderPreview();
  }

  // --- IMAGE 1:1 SQUARE CROPPING ENGINE ---
  const croppedImageCache = new Map();

  function cropImageToSquare(url) {
    if (!url || typeof url !== 'string' || !url.startsWith('http')) return Promise.resolve(url);
    if (croppedImageCache.has(url)) return Promise.resolve(croppedImageCache.get(url));

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      const timer = setTimeout(() => {
        croppedImageCache.set(url, url);
        resolve(url);
      }, 4000);

      img.onload = () => {
        clearTimeout(timer);
        try {
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;
          
          if (!w || !h || w === h) {
            // Already 1:1 square
            croppedImageCache.set(url, url);
            return resolve(url);
          }

          // Not 1:1, crop based on smaller side
          const minSide = Math.min(w, h);
          const targetSize = Math.min(minSide, 300);

          const canvas = document.createElement('canvas');
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext('2d');

          let sx = 0, sy = 0;
          if (w > h) {
            // Horizontal image: center horizontally
            sx = (w - h) / 2;
            sy = 0;
          } else {
            // Vertical image (e.g. character standing): crop from top so head/face is preserved
            sx = 0;
            sy = 0;
          }

          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, targetSize, targetSize);
          const croppedDataUrl = canvas.toDataURL('image/png');
          croppedImageCache.set(url, croppedDataUrl);
          resolve(croppedDataUrl);
        } catch (err) {
          // If canvas export fails (e.g. CORS), fallback to original URL
          croppedImageCache.set(url, url);
          resolve(url);
        }
      };

      img.onerror = () => {
        clearTimeout(timer);
        croppedImageCache.set(url, url);
        resolve(url);
      };

      img.src = url;
    });
  }

  // --- ROOM URL & FIRESTORE API LOADER ---
  function extractRoomId(input) {
    if (!input) return null;
    input = input.trim();
    const match = input.match(/rooms\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    if (/^[a-zA-Z0-9_-]{8,}$/.test(input)) return input;
    return null;
  }

  async function fetchLogsFromAPI(roomId, userToken) {
    let token = userToken || state.apiToken;
    
    // Check Chrome extension tabs if running in extension context
    if (!token && typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.url && tab.url.includes('ccfolia.com')) {
          const res = await chrome.tabs.sendMessage(tab.id, { action: 'getAuthToken' }).catch(() => null);
          if (res && res.token) token = res.token;
        } else {
          const tabs = await chrome.tabs.query({ url: "*://ccfolia.com/*" });
          if (tabs.length > 0) {
            const res = await chrome.tabs.sendMessage(tabs[0].id, { action: 'getAuthToken' }).catch(() => null);
            if (res && res.token) token = res.token;
          }
        }
      } catch (e) { console.warn('Extension token query note:', e); }
    }

    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    updateStatus('코코포리아 연결 중...', 'editing');

    // Supplementary fetches: Character portraits and Room title in parallel
    const charactersMap = {};
    let roomTitle = '';

    const charPromise = fetch(`https://firestore.googleapis.com/v1/projects/ccfolia-160aa/databases/(default)/documents/rooms/${roomId}/characters?pageSize=300`, { headers })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.documents) {
          data.documents.forEach(doc => {
            const fields = doc.fields || {};
            const name = fields.name?.stringValue;
            if (name) {
              charactersMap[name] = {
                iconUrl: fields.iconUrl?.stringValue || fields.avatarUrl?.stringValue || '',
                color: fields.color?.stringValue || ''
              };
            }
          });
        }
      })
      .catch(e => console.warn('Characters API fetch note:', e));

    const roomPromise = fetch(`https://firestore.googleapis.com/v1/projects/ccfolia-160aa/databases/(default)/documents/rooms/${roomId}`, { headers })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.fields) {
          roomTitle = data.fields.name?.stringValue || data.fields.title?.stringValue || '';
        }
      })
      .catch(e => console.warn('Room info API fetch note:', e));

    // Paginated fetch of messages
    let allMessages = [];
    let pageToken = '';
    
    while (true) {
      const apiUrl = `https://firestore.googleapis.com/v1/projects/ccfolia-160aa/databases/(default)/documents/rooms/${roomId}/messages?pageSize=300${pageToken ? '&pageToken=' + pageToken : ''}`;
      const res = await fetch(apiUrl, { headers });
      
      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          throw new Error('AUTH_REQUIRED');
        }
        throw new Error(`방에 접근할 수 없습니다 (HTTP ${res.status}). 올바른 주소인지 확인해주세요.`);
      }
      
      const data = await res.json();
      if (data.documents && data.documents.length > 0) {
        allMessages = allMessages.concat(data.documents);
        showToast(`메시지 로딩 중... (${allMessages.length.toLocaleString()}개)`);
        updateStatus(`로딩 중 (${allMessages.length.toLocaleString()}개)`, 'editing');
      }
      
      if (data.nextPageToken) {
        pageToken = data.nextPageToken;
      } else {
        break;
      }
    }

    // Wait for supplementary fetches to finish
    await Promise.all([charPromise, roomPromise]);

    if (allMessages.length === 0) {
      throw new Error('방에 저장된 채팅 로그가 없습니다.');
    }

    // Parse Firestore documents
    const logs = allMessages.map(doc => {
      const fields = doc.fields || {};
      let text = fields.text?.stringValue || '';
      const diceResult = fields.extend?.mapValue?.fields?.roll?.mapValue?.fields?.result?.stringValue;
      if (diceResult) text += ' ' + diceResult;
      const fullText = text;

      let name = fields.name?.stringValue || 'System';
      if (name === 'System' || name === '시스템') {
        const match = text.match(/^(.+?)\s*-\s*(판정|선언|Check|Roll)\s+(.*)/);
        if (match) {
          name = match[1].trim();
          text = match[3].trim();
        }
      }

      const tab = (() => {
        const nm = name.toLowerCase();
        if (nm === 'system') return 'system';
        const t = fields.channelName?.stringValue || fields.tab?.stringValue || '메인';
        return normalizeTabName(t);
      })();

      let color = fields.color?.stringValue || (charactersMap[name] && charactersMap[name].color) || '#ffffff';
      // Individual chat message's icon (selected standing for this chat) - exact cocoroke extraction
      let iconUrl = fields.iconUrl?.stringValue || fields.avatarUrl?.stringValue || null;
      const createdAt = fields.createdAt?.timestampValue || doc.createTime || new Date().toISOString();

      return {
        tab,
        name,
        text,
        color,
        iconUrl,
        createdAt,
        isSuccess: /(성공|success|대성공|크리티컬|critical)[\s!?.]*$/i.test(fullText),
        isFailure: /(실패|failure|펌블|fumble)[\s!?.]*$/i.test(fullText),
        hasDice: !!diceResult || /(\d+[dD]\d+|\[\d+(?:,\s*\d+)*\]|→\s*\d+)/.test(text)
      };
    }).filter(log => log.text && log.text.trim() !== '');

    logs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // Detect image dimensions and crop non-1:1 images based on smaller side to 1:1
    const uniqueIcons = Array.from(new Set(logs.map(l => l.iconUrl).filter(Boolean)));
    if (uniqueIcons.length > 0) {
      showToast('프로필 이미지 1:1 비율 최적화 중...');
      const cropMap = new Map();
      await Promise.all(uniqueIcons.map(async (u) => {
        const cropped = await cropImageToSquare(u);
        cropMap.set(u, cropped);
      }));
      logs.forEach(l => {
        if (l.iconUrl && cropMap.has(l.iconUrl)) {
          l.iconUrl = cropMap.get(l.iconUrl);
        }
      });
      for (const charName in charactersMap) {
        if (charactersMap[charName].iconUrl && cropMap.has(charactersMap[charName].iconUrl)) {
          charactersMap[charName].iconUrl = cropMap.get(charactersMap[charName].iconUrl);
        }
      }
    }

    return { logs, roomTitle, charactersMap };
  }

  // --- HTML FILE PARSER ---
  function handleFileSelect(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      await processLogHTML(e.target.result, file.name);
    };
    reader.readAsText(file);
  }

  async function processLogHTML(htmlText, fileName) {
    updateStatus('로딩 중...', 'editing');
    
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');
      
      const decodeHTML = (htmlStr) => {
        const temp = document.createElement('div');
        temp.innerHTML = htmlStr.replace(/<br\s*\/?>/gi, '\n');
        return temp.textContent.trim();
      };

      const dls = doc.querySelectorAll('dl');
      let logs = [];
      
      if (dls.length > 0) {
        // Log Format type 1 (definition list based)
        logs = Array.from(dls).map(dl => {
          let rawClass = dl.className || '';
          let tab = '메인';
          if (rawClass.includes('main')) tab = '메인';
          else if (rawClass.includes('zatsudan')) tab = '잡담';
          else if (rawClass.includes('tab_0') || rawClass.includes('info')) tab = 'info';
          else if (rawClass.includes('tab_1') || rawClass.includes('secret')) tab = 'secret';
          else tab = 'custom';

          const headerLabels = doc.querySelectorAll('header label');
          headerLabels.forEach(lbl => {
            const input = lbl.querySelector('input');
            if (input && rawClass.includes(input.id)) tab = lbl.textContent.trim();
          });

          tab = normalizeTabName(tab);

          let name = dl.querySelector('dt')?.textContent?.trim() || 'System';
          if (name.toLowerCase() === 'system') tab = 'system';
          
          let text = decodeHTML(dl.querySelector('dd')?.innerHTML || '');
          const imgEl = dl.querySelector('img[alt="avatar"]') || dl.querySelector('img');
          const iconUrl = imgEl ? imgEl.src : null;
          const fullText = text;
          
          let color = dl.style.color;
          if (!color) {
            const dt = dl.querySelector('dt');
            const dd = dl.querySelector('dd');
            color = dt?.style.color || dd?.style.color || '#fff';
          }
          
          return {
            tab, name, text, iconUrl, color,
            isSuccess: /(성공|success|대성공|크리티컬|critical)[\s!?.]*$/i.test(fullText),
            isFailure: /(실패|failure|펌블|fumble)[\s!?.]*$/i.test(fullText),
            hasDice: /(\d+[dD]\d+|\[\d+(?:,\s*\d+)*\]|→\s*\d+)/.test(text)
          };
        });
      } else {
        // Log Format type 2 (paragraph based)
        logs = Array.from(doc.querySelectorAll('p')).map(p => {
          let tab = '메인', name = 'System', text = '', color = '#fff';
          const spans = p.querySelectorAll('span');
          
          if (p.style.color) {
            color = p.style.color;
          }
          
          if (spans.length >= 3) {
            tab = spans[0].textContent.replace(/[\[\]]/g, '').trim();
            name = spans[1].textContent.replace(/:$/, '').trim();
            if (color === '#fff') {
              color = spans[1].style.color || '#fff';
            }
            text = decodeHTML(Array.from(spans).slice(2).map(s => s.innerHTML).join('')).replace(/^:/, '').trim();
          } else {
            const tabSpan = p.querySelector('span');
            if (tabSpan && tabSpan.textContent.trim().startsWith('[')) {
              tab = tabSpan.textContent.replace(/[\[\]]/g, '').trim();
            }
            const fullText = decodeHTML(p.innerHTML.replace(/(<([^>]+)>)/gi, ""));
            const parts = fullText.split(':');
            if (parts.length > 1) {
              name = parts[0].replace(/\[.*?\]/, '').trim();
              text = parts.slice(1).join(':').trim();
            } else {
              text = fullText;
            }
            if (color === '#fff') {
              if (spans.length > 1) color = spans[1].style.color;
              else if (spans.length === 1 && !spans[0].textContent.startsWith('[')) color = spans[0].style.color;
            }
          }

          tab = normalizeTabName(tab);

          if (!name) name = 'System';
          if (name === 'System' || name === '시스템') {
            const match = text.match(/^(.+?)\s*-\s*(판정|선언|Check|Roll)\s+(.*)/);
            if (match) { name = match[1].trim(); text = match[3].trim(); }
          }
          if (name.toLowerCase() === 'system') tab = 'system';

          const imgEl = p.querySelector('img');
          const iconUrl = imgEl ? imgEl.src : null;
          const fullText = text;
          
          return {
            tab, name, text, iconUrl, color,
            isSuccess: /(성공|success|대성공|크리티컬|critical)[\s!?.]*$/i.test(fullText),
            isFailure: /(실패|failure|펌블|fumble)[\s!?.]*$/i.test(fullText),
            hasDice: /(\d+[dD]\d+|\[\d+(?:,\s*\d+)*\]|→\s*\d+)/.test(text)
          };
        });
      }

      // Detect image dimensions and crop non-1:1 images based on smaller side to 1:1
      const uniqueIcons = Array.from(new Set(logs.map(l => l.iconUrl).filter(Boolean)));
      if (uniqueIcons.length > 0) {
        updateStatus(`이미지 1:1 크기 변환 중 (${uniqueIcons.length}개)...`, 'editing');
        const cropMap = new Map();
        await Promise.all(uniqueIcons.map(async (u) => {
          const cropped = await cropImageToSquare(u);
          cropMap.set(u, cropped);
        }));
        logs.forEach(l => {
          if (l.iconUrl && cropMap.has(l.iconUrl)) {
            l.iconUrl = cropMap.get(l.iconUrl);
          }
        });
      }

      setLoadedLogs(logs, fileName, 'file');
    } catch (err) {
      alert("로그 파일 분석 중 에러가 발생했습니다.");
      console.error(err);
      updateStatus('분석 실패', 'muted');
    }
  }

  // --- PREVIEW RENDERING & SYNCHRONIZATION ---
  function renderPreview() {
    if (state.parsedLogs.length === 0) return;
    
    const isEditing = !state.rangeSelectMode;
    
    const htmlContent = generateHTMLCode(
      state.parsedLogs, 
      state.selectedTheme, 
      state.showIcons, 
      state.blogHeader, 
      state.charSettings, 
      state.tabColors, 
      state.narrators, 
      state.fontSetting,
      isEditing
    );
    
    const frame = document.getElementById('previewFrame');
    const doc = frame.contentDocument || frame.contentWindow.document;
    
    doc.open();
    doc.write(htmlContent);
    doc.close();

    // Set up event delegation inside the preview iframe
    if (isEditing) {
      setTimeout(() => {
        setupIframeEventDelegation();
      }, 50);
    }

    // Check if Range Select Mode should be applied
    if (state.rangeSelectMode) {
      setTimeout(() => {
        enableRangeSelection(true);
      }, 50);
    }
  }

  function clearPreviewFrame() {
    const frame = document.getElementById('previewFrame');
    const doc = frame.contentDocument || frame.contentWindow.document;
    doc.open();
    doc.write('');
    doc.close();
  }

  let sidebarTimeout = null;
  function debounceRenderSidebar() {
    if (sidebarTimeout) clearTimeout(sidebarTimeout);
    sidebarTimeout = setTimeout(() => {
      renderCharSettingsList();
      renderNarratorList();
    }, 1000);
  }

  function setupIframeEventDelegation() {
    const frame = document.getElementById('previewFrame');
    const doc = frame.contentDocument || frame.contentWindow.document;
    if (!doc) return;

    const container = doc.querySelector('.log-container');
    if (!container) return;

    // 1. Click events delegation for buttons (delete, add, move, edit)
    container.onclick = (e) => {
      const btn = e.target.closest('.edit-ctrl-btn');
      if (!btn) return;

      e.preventDefault();
      e.stopPropagation();

      const idx = parseInt(btn.dataset.idx);
      if (isNaN(idx)) return;

      if (btn.classList.contains('btn-delete')) {
        showDeleteConfirmModal(idx);
      } else if (btn.classList.contains('btn-add-after')) {
        addLogEntryAfter(idx);
      } else if (btn.classList.contains('btn-move-up')) {
        moveLogEntryUp(idx);
      } else if (btn.classList.contains('btn-move-down')) {
        moveLogEntryDown(idx);
      } else if (btn.classList.contains('btn-edit-text')) {
        const entry = btn.closest('.log-entry');
        if (entry) {
          const textCol = entry.querySelector('.text-col');
          if (textCol) {
            textCol.focus();
            const range = doc.createRange();
            const sel = frame.contentWindow.getSelection();
            range.selectNodeContents(textCol);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
      }
    };

    // 2. Input/Blur events delegation for contenteditable sync
    container.oninput = (e) => {
      const target = e.target;
      const entry = target.closest('.log-entry');
      if (!entry) return;

      const idx = parseInt(entry.dataset.idx);
      if (isNaN(idx) || !state.parsedLogs[idx]) return;

      if (target.classList.contains('text-col')) {
        state.parsedLogs[idx].text = target.innerText;
      } else if (target.closest('.name-col')) {
        const nameText = target.innerText.trim();
        if (nameText) {
          const oldName = state.parsedLogs[idx].name;
          if (oldName !== nameText) {
            state.parsedLogs[idx].name = nameText;
            if (!state.uniqueCharacters.includes(nameText)) {
              state.uniqueCharacters.push(nameText);
              debounceRenderSidebar();
            }
          }
        }
      }
    };
  }

  let pendingDeleteIdx = null;

  function showDeleteConfirmModal(idx) {
    pendingDeleteIdx = idx;
    const modal = document.getElementById('confirmModal');
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  function hideDeleteConfirmModal() {
    pendingDeleteIdx = null;
    const modal = document.getElementById('confirmModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  function deleteLogEntry(idx) {
    if (idx < 0 || idx >= state.parsedLogs.length) return;
    state.parsedLogs.splice(idx, 1);
    
    // Update range selection boundaries if active
    if (state.startIdx !== null) {
      if (idx < state.startIdx) state.startIdx--;
      else if (idx === state.startIdx) state.startIdx = null;
    }
    if (state.endIdx !== null) {
      if (idx < state.endIdx) state.endIdx--;
      else if (idx === state.endIdx) state.endIdx = null;
    }
    if (state.startIdx === null || state.endIdx === null) {
      state.endIdx = null;
    }
    
    renderPreview();
  }

  function addLogEntryAfter(idx) {
    if (idx < 0 || idx >= state.parsedLogs.length) return;
    
    const parentLog = state.parsedLogs[idx];
    const newLog = {
      tab: parentLog.tab || '메인',
      name: parentLog.name || 'System',
      text: '새로운 채팅 내용',
      iconUrl: parentLog.iconUrl || null,
      color: parentLog.color || '#ffffff',
      isSuccess: false,
      isFailure: false,
      hasDice: false
    };
    
    state.parsedLogs.splice(idx + 1, 0, newLog);
    
    // Update range selection boundaries if active
    if (state.startIdx !== null && idx < state.startIdx) state.startIdx++;
    if (state.endIdx !== null && idx < state.endIdx) state.endIdx++;
    
    renderPreview();
  }

  function moveLogEntryUp(idx) {
    if (idx <= 0 || idx >= state.parsedLogs.length) return;
    
    const temp = state.parsedLogs[idx];
    state.parsedLogs[idx] = state.parsedLogs[idx - 1];
    state.parsedLogs[idx - 1] = temp;
    
    // Update range selection if active
    if (state.startIdx !== null) {
      if (state.startIdx === idx) state.startIdx--;
      else if (state.startIdx === idx - 1) state.startIdx++;
    }
    if (state.endIdx !== null) {
      if (state.endIdx === idx) state.endIdx--;
      else if (state.endIdx === idx - 1) state.endIdx++;
    }
    
    renderPreview();
  }

  function moveLogEntryDown(idx) {
    if (idx < 0 || idx >= state.parsedLogs.length - 1) return;
    
    const temp = state.parsedLogs[idx];
    state.parsedLogs[idx] = state.parsedLogs[idx + 1];
    state.parsedLogs[idx + 1] = temp;
    
    // Update range selection if active
    if (state.startIdx !== null) {
      if (state.startIdx === idx) state.startIdx++;
      else if (state.startIdx === idx + 1) state.startIdx--;
    }
    if (state.endIdx !== null) {
      if (state.endIdx === idx) state.endIdx++;
      else if (state.endIdx === idx + 1) state.endIdx--;
    }
    
    renderPreview();
  }

  // Enable/Disable range selection mode in Iframe content
  function enableRangeSelection(enabled) {
    const frame = document.getElementById('previewFrame');
    const doc = frame.contentDocument || frame.contentWindow.document;
    if (!doc) return;

    let styleEl = doc.getElementById('range-selection-styles');
    if (!styleEl && enabled) {
      styleEl = doc.createElement('style');
      styleEl.id = 'range-selection-styles';
      styleEl.textContent = `
        .log-entry { cursor: pointer !important; transition: opacity 0.2s, outline 0.2s !important; }
        .log-entry:hover { outline: 1px dashed var(--accent-color, #ff4d4d) !important; outline-offset: 2px; }
        .log-entry.range-dimmed { opacity: 0.3 !important; filter: grayscale(30%) !important; }
        .log-entry.range-selected-in { outline: 1px solid rgba(255, 77, 77, 0.3) !important; background: rgba(255, 77, 77, 0.02) !important; }
        .log-entry.range-selected-start { outline: 2px solid var(--accent-color, #ff4d4d) !important; border-radius: 4px; position: relative; }
        .log-entry.range-selected-end { outline: 2px solid var(--accent-color, #ff4d4d) !important; border-radius: 4px; position: relative; }
        .log-entry.range-selected-start::after { content: '시작 지점'; position: absolute; top: -16px; left: 8px; background: var(--accent-color, #ff4d4d); color: white; font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: bold; z-index: 10; line-height: 1; }
        .log-entry.range-selected-end::after { content: '끝 지점'; position: absolute; top: -16px; left: 8px; background: var(--accent-color, #ff4d4d); color: white; font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: bold; z-index: 10; line-height: 1; }
        .log-entry.range-selected-start.range-selected-end::after { content: '선택 행'; }
      `;
      doc.head.appendChild(styleEl);
    } else if (!enabled && styleEl) {
      styleEl.remove();
    }

    const entries = doc.querySelectorAll('.log-entry');
    entries.forEach(entry => {
      if (enabled) {
        entry.onclick = () => {
          const idx = parseInt(entry.dataset.idx);
          if (isNaN(idx)) return;
          handleEntryClickForRange(idx);
        };
      } else {
        entry.onclick = null;
        entry.classList.remove('range-dimmed', 'range-selected-in', 'range-selected-start', 'range-selected-end');
      }
    });

    if (enabled) {
      updateRangeSelectionUI();
    }
  }

  function handleEntryClickForRange(idx) {
    if (state.startIdx === null) {
      state.startIdx = idx;
    } else if (state.endIdx === null) {
      if (idx < state.startIdx) {
        state.startIdx = idx;
      } else {
        state.endIdx = idx;
      }
    } else {
      state.startIdx = idx;
      state.endIdx = null;
    }
    updateRangeSelectionUI();
  }

  function updateRangeSelectionUI() {
    const frame = document.getElementById('previewFrame');
    const doc = frame.contentDocument || frame.contentWindow.document;
    if (!doc) return;

    const entries = doc.querySelectorAll('.log-entry');
    entries.forEach(entry => {
      const idx = parseInt(entry.dataset.idx);
      entry.classList.remove('range-dimmed', 'range-selected-in', 'range-selected-start', 'range-selected-end');

      if (state.startIdx !== null && state.endIdx !== null) {
        if (idx < state.startIdx || idx > state.endIdx) {
          entry.classList.add('range-dimmed');
        } else {
          entry.classList.add('range-selected-in');
          if (idx === state.startIdx) entry.classList.add('range-selected-start');
          if (idx === state.endIdx) entry.classList.add('range-selected-end');
        }
      } else if (state.startIdx !== null) {
        if (idx === state.startIdx) {
          entry.classList.add('range-selected-start');
        } else {
          entry.classList.add('range-dimmed');
        }
      }
    });

    const display = document.getElementById('rangeSelectionDisplay');
    if (state.startIdx !== null && state.endIdx !== null) {
      const count = state.endIdx - state.startIdx + 1;
      display.innerHTML = `선택 범위: <strong>${state.startIdx + 1}번째 행 ~ ${state.endIdx + 1}번째 행</strong> (총 ${count}개 행 선택됨)`;
    } else if (state.startIdx !== null) {
      display.innerHTML = `시작 지점 선택됨: <strong>${state.startIdx + 1}번째 행</strong>. 끝 지점 행을 클릭하여 범위를 완성하세요.`;
    } else {
      display.innerHTML = `선택 범위: 없음 (전체 복사/다운로드됨)`;
    }
  }

  function resetRangeSelection() {
    state.startIdx = null;
    state.endIdx = null;
    updateRangeSelectionUI();
  }

  // --- HTML CODE GENERATION ENGINE ---
  function generateHTMLCode(parsedLogs, theme = 'default', showIcons = false, blogHeader = false, charSettings = {}, tabColors = {}, narrators = [], fontSetting = null, isEditing = false) {
    const uniqueTabs = [];
    parsedLogs.forEach(log => {
      const t = log.tab || '메인';
      if (t !== 'system' && !uniqueTabs.includes(t)) uniqueTabs.push(t);
    });
    const getTabIdx = (t) => uniqueTabs.indexOf(t);

    let checkboxesHTML = uniqueTabs.map((t, idx) => `<input type="checkbox" id="chk-tab-${idx}" class="tab-chk" checked>`).join('\n');
    let labelsHTML = uniqueTabs.map((t, idx) => `
      <label class="tab-filter-label label-for-chk-${idx}" for="chk-tab-${idx}">
        <div class="custom-chk"></div> ${escapeHtml(t)}
      </label>`).join('\n');

    const filterShowRules = uniqueTabs.map((t, idx) => {
      const isMain = t === '메인';
      return `
      #chk-tab-${idx}:not(:checked) ~ .ccfolia-log-wrapper .log-group[data-tab-idx="${idx}"] { display: none !important; }
      ${!isMain ? `#chk-tab-${idx}:not(:checked) ~ .ccfolia-log-wrapper .log-sep-outer[data-after-tab-idx="${idx}"] { display: block !important; }` : ''}
      #chk-tab-${idx}:checked ~ .tab-filter-menu .label-for-chk-${idx} .custom-chk { background: var(--accent-color, #e74c3c); border-color: var(--accent-color, #e74c3c); }
      #chk-tab-${idx}:not(:checked) ~ .tab-filter-menu .label-for-chk-${idx} { color: #666; }
      `.trim();
    }).join('\n');

    const filterHideRules = uniqueTabs.map((t, idx) => {
      const isMain = t === '메인';
      return `
      #chk-tab-${idx}:not(:checked) ~ .ccfolia-log-wrapper .log-sep-outer[data-next-tab-idx="${idx}"] { display: none !important; }
      ${isMain ? `
      #chk-tab-${idx}:not(:checked) ~ .ccfolia-log-wrapper .log-sep-outer[data-after-tab-idx="${idx}"] { display: none !important; }
      #chk-tab-${idx}:not(:checked) ~ .ccfolia-log-wrapper .log-group[data-tab-idx="${idx}"] .log-sep { display: none !important; }
      ` : ''}
      `.trim();
    }).join('\n');

    let filterStylesHTML = filterShowRules + '\n' + filterHideRules;

    // Inject Custom Tab specific background colors
    let customTabColorsCSS = '';
    uniqueTabs.forEach((t, idx) => {
      const customBg = tabColors[t];
      if (customBg) {
        customTabColorsCSS += `
        .ccfolia-log-wrapper .log-group[data-tab-idx="${idx}"] { background: ${customBg} !important; border: 1px solid rgba(255,255,255,0.06); }
        `;
      }
    });

    let baseCSS = `
      body { margin: 0; padding: 0; }
      .log-container { max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; }
      .log-group { position: relative; padding: 15px; border-radius: 8px; }
      .log-group.tab-main { padding: 0; border-radius: 0; }
      .log-group.tab-other { margin: 3px 0; margin-left: 50px; }
      .log-group.tab-custom { padding-top: 25px; margin: 3px 0; }
      .tab-badge { position: absolute; top: 10px; right: 15px; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; }
      .log-entry { display: flex; gap: 15px; align-items: center; }
      .name-col { width: 150px; flex-shrink: 0; text-align: left; font-weight: bold; font-size: 11px; display: flex; align-items: center; justify-content: flex-start; gap: 8px; align-self: flex-start; padding-top: 2px; }
      .avatar-img { width: 24px; height: 24px; border-radius: 8px; object-fit: cover; object-position: center top; border: 1px solid rgba(255,255,255,0.1); flex-shrink: 0; aspect-ratio: 1 / 1; }
      .text-col { flex-grow: 1; word-break: break-word; font-size: 12px; min-width: 0; white-space: pre-wrap; align-self: center; line-height: 1.8; }
      .log-sep { height: 1px; margin: 5px 0; border: none; }
      .log-sep-outer { display: none; height: 1px; margin: 5px 0; border: none; }

      /* Narration Styles */
      .log-entry.narration-entry { justify-content: center; padding: 8px 0; } /* 12px -> 2px로 위아래 여백 축소 */
      body:not(.is-editing) .log-entry.narration-entry .name-col { display: none !important; }
      .log-entry.narration-entry .text-col { text-align: center !important; font-size: 14px !important; max-width: 90%; width: 100%; font-weight: bold !important; font-style: italic !important; line-height: 1.5 !important;}
      
      @media (max-width: 600px) {
        .ccfolia-log-wrapper { padding: 16px !important; }
        .log-group { padding: 5px 10px !important; margin-top: 0 !important; }
        .log-group.tab-other { margin-left: 20px !important; }
        .log-sep { margin: 5px 15px !important; }
        .log-sep-outer { margin: 5px 15px !important; }
        .avatar-img[style*="visibility:hidden"] { display: none !important; }
        .log-entry { flex-direction: column; align-items: flex-start; gap: 3px; }
        .name-col { width: auto !important; font-size: 13px !important; flex-direction: row; padding-top: 0; opacity: 0.75; padding-left: 10px; }
        .name-col:empty { display: none; }
        .text-col { font-size: 13px !important; line-height: 1.6 !important; text-align: left !important; align-self: flex-start !important; width: 100%; padding-left: 10px; }
        .avatar-img { width: 18px !important; height: 18px !important; aspect-ratio: 1 / 1 !important; object-fit: cover !important; object-position: center top !important; }
        .tab-filter-btn { font-size: 10px; padding: 6px 10px; }
        
        .log-entry.narration-entry .text-col { padding-left: 0 !important; }
      }
      .bgm-container { max-width: 400px; margin: 0 auto 20px; width: 100%; box-sizing: border-box; }
      .bgm-summary { border-radius: 8px; padding: 12px 16px; cursor: pointer; width: 100%; box-sizing: border-box; display: block; overflow: hidden; border: 1px solid rgba(255,255,255,0.15); }
      .bgm-summary-title { font-size: 13px; font-weight: bold; display: flex; align-items: center; justify-content: space-between; user-select: none; list-style: none; }
      .bgm-summary-title::-webkit-details-marker { display: none; }
      .bgm-list { list-style: none !important; padding: 0; margin: 10px 0 0; width: 100%; box-sizing: border-box; }
      .bgm-list li { list-style: none !important; padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,0.08); font-size: 13px; overflow: hidden; }
      .bgm-list li::marker { display: none; content: ''; }
      .bgm-list li:last-child { border-bottom: none; }
      .bgm-inline-link { color: inherit; text-decoration: none; opacity: 0.9; font-style: italic; }
      .bgm-inline-link:hover { opacity: 1; text-decoration: underline; }
      .bgm-list-link { color: inherit !important; text-decoration: none; opacity: 0.85; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .bgm-list-link:hover { opacity: 1; text-decoration: underline; }
      ${filterStylesHTML}
      ${customTabColorsCSS}
      .tab-chk { display: none; }
      #chk-toggle { display: none; }
      .tab-filter-btn { position: fixed; top: ${blogHeader ? '50px' : '20px'}; right: 20px; background: #333; color: #eee; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: bold; z-index: 1000; box-shadow: 0 2px 6px rgba(0,0,0,0.4); border: 1px solid #555; user-select: none; transition: background 0.2s, color 0.2s; letter-spacing: 0.03em; }
      .tab-filter-btn:hover { background: #444; }
      .tab-filter-menu { position: fixed; top: ${blogHeader ? '90px' : '60px'}; right: -250px; width: 200px; background: #252525; border: 1px solid #444; border-radius: 8px; padding: 15px; transition: right 0.3s ease; z-index: 999; box-shadow: -2px 5px 10px rgba(0,0,0,0.5); font-family: 'Malgun Gothic', sans-serif; }
      #chk-toggle:checked ~ .tab-filter-menu { right: 20px; }
      .tab-filter-title { font-size: 12px; color: #888; margin-bottom: 10px; font-weight: bold; border-bottom: 1px solid #444; padding-bottom: 5px; }
      .tab-filter-label { display: flex; align-items: center; margin-bottom: 8px; font-size: 13px; color: #eee; cursor: pointer; user-select: none; transition: color 0.2s; }
      .custom-chk { width: 14px; height: 14px; border-radius: 3px; border: 2px solid #555; margin-right: 8px; transition: background 0.2s, border-color 0.2s; }

      /* Edit Mode Styles */
      :root {
        --edit-btn-bg: rgba(30, 30, 30, 0.9);
        --edit-btn-color: #ccc;
      }
      body.is-editing .log-entry {
        position: relative;
        transition: background 0.2s ease, box-shadow 0.2s ease;
        border-radius: 6px;
      }
      body.is-editing .log-entry:hover {
        background: rgba(255, 255, 255, 0.02);
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
      }
      body.light-theme.is-editing .log-entry:hover {
        background: rgba(0, 0, 0, 0.02);
        box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.03);
      }
      body.is-editing .edit-controls-wrapper {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        gap: 4px;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.15s ease;
        z-index: 100;
      }
      body.is-editing .log-entry:hover .edit-controls-wrapper {
        opacity: 1;
        pointer-events: auto;
      }
      body.is-editing .edit-ctrl-btn {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 1px solid rgba(255, 255, 255, 0.15);
        background: var(--edit-btn-bg);
        color: var(--edit-btn-color);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.15s ease;
        user-select: none;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        padding: 0;
        line-height: 1;
      }
      body.is-editing .edit-ctrl-btn:hover {
        transform: scale(1.15);
      }
      body.is-editing .edit-ctrl-btn.btn-move-up:hover,
      body.is-editing .edit-ctrl-btn.btn-move-down:hover {
        background: #3b82f6 !important;
        border-color: #3b82f6 !important;
        color: #fff !important;
      }
      body.is-editing .edit-ctrl-btn.btn-edit-text:hover {
        background: #f59e0b !important;
        border-color: #f59e0b !important;
        color: #fff !important;
      }
      body.is-editing .edit-ctrl-btn.btn-add-after:hover {
        background: #10b981 !important;
        border-color: #10b981 !important;
        color: #fff !important;
      }
      body.is-editing .edit-ctrl-btn.btn-delete:hover {
        background: #ef4444 !important;
        border-color: #ef4444 !important;
        color: #fff !important;
      }
      body.is-editing .text-col,
      body.is-editing .name-col span {
        outline: none;
        background: transparent;
      }
      body.is-editing .text-col:focus,
      body.is-editing .name-col span:focus {
        outline: 1px dashed rgba(245, 158, 11, 0.7) !important;
        background: rgba(245, 158, 11, 0.04) !important;
        cursor: text;
        padding: 2px 4px;
        border-radius: 4px;
      }
      
    `;

    let themeCSS = '';
    if (theme === 'light') {
      themeCSS = `
        :root { --dice-success: #27ae60; --dice-fail: #c0392b; --dice-info: #2980b9; --accent-color: #2980b9; --edit-btn-bg: rgba(255, 255, 255, 0.9); --edit-btn-color: #555; }
        body { background-color: #f5f6fa; }
        .ccfolia-log-wrapper { background: #f5f6fa; color: #2c3e50; padding: 40px; font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; line-height: 1.4; }
        .tab-filter-btn { background: #dde3ed; color: #2c3e50; border-color: #bbc3d0; }
        .tab-filter-btn:hover { background: #c8d0de; }
        .log-group { background: #ffffff; border: 1px solid #dcdde1; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .log-group.tab-main { background: transparent; border: none; box-shadow: none; }
        .log-group.tab-info { margin: 3px 0; background: #f0f8ff; border-color: #bce0fd; }
        .bgm-summary.tab-info { background: #f0f8ff; color: #2c3e50; border-color: #bce0fd; }
        .log-group.tab-other { background: #e0e0e0; border-color: #ccc; }
        .log-group.tab-other .text-col { color: #555 !important; }
        .log-group.tab-custom { border-left: 4px solid var(--tab-color, #888); }
        .tab-badge { background: var(--tab-color, #eee); color: #fff; text-shadow: 0 1px 1px rgba(0,0,0,0.3); }
        .log-sep, .log-sep-outer { background: #eaeff2; }
      `;
    } else if (theme === 'blackred') {
      themeCSS = `
        :root { --dice-success: #ff6666; --dice-fail: #cc4444; --dice-info: #ff9999; --accent-color: #880000; }
        body { background-color: #0d0d0d; }
        .ccfolia-log-wrapper { background: #0d0d0d; color: #cccccc; padding: 40px; font-family: 'Malgun Gothic', sans-serif; line-height: 1.4; }
        .tab-filter-btn { background: #1a1a1a; color: #cc3333; border-color: #880000; }
        .tab-filter-btn:hover { background: #2a1010; }
        .log-group { background: #181818; border: 1px solid #880000; }
        .log-group.tab-main { background: transparent; border: none; }
        .log-group.tab-info { margin: 3px 0; background: #880000; border-color: #880000; color: #f5c0c0; }
        .bgm-summary.tab-info { background: #880000; color: #f5c0c0; border-color: #600000; }
        .log-group.tab-other { background: #2a2a2a; border-color: #600000; }
        .log-group.tab-other .text-col { color: #999999 !important; }
        .log-group.tab-custom { border-left: 2px solid var(--tab-color, #880000); }
        .tab-badge { background: #880000; color: #ffd0d0; border: 1px solid #600000; }
        .log-sep, .log-sep-outer { background: #880000; opacity: 0.4; }
      `;
    } else if (theme === 'darkgreen') {
      themeCSS = `
        :root { --dice-success: #2ecc71; --dice-fail: #e74c3c; --dice-info: #81c784; --accent-color: #2e7d32; }
        body { background-color: #0a1910; }
        .ccfolia-log-wrapper { background: #0a1910; color: #c8e6c9; padding: 40px; font-family: 'Malgun Gothic', sans-serif; line-height: 1.4; }
        .tab-filter-btn { background: #0a1f10; color: #c8e6c9; border-color: #2e7d32; }
        .tab-filter-btn:hover { background: #143623; }
        .log-group { background: #0f291a; border: 1px solid #1b5e20; }
        .log-group.tab-main { background: transparent; border: none; }
        .log-group.tab-info { margin: 3px 0; background: #143623; border-color: #2e7d32; }
        .bgm-summary.tab-info { background: #143623; color: #c8e6c9; border-color: #2e7d32; }
        .log-group.tab-other { background: #111; border-color: #1b5e20; }
        .log-group.tab-other .text-col { color: #617b57 !important; }
        .log-group.tab-custom { border-left: 2px solid var(--tab-color, #2ecc71); }
        .tab-badge { background: var(--tab-color, #1b5e20); color: #c8e6c9; border: 1px solid #2e7d32; }
        .log-sep, .log-sep-outer { background: #1b5e20; }
      `;
    } else if (theme === 'darkblue') {
      themeCSS = `
        :root { --dice-success: #4fc3f7; --dice-fail: #e74c3c; --dice-info: #81b4e6; --accent-color: #1565c0; }
        body { background-color: #0a1019; }
        .ccfolia-log-wrapper { background: #0a1019; color: #bbdefb; padding: 40px; font-family: 'Malgun Gothic', sans-serif; line-height: 1.4; }
        .tab-filter-btn { background: #0a1428; color: #bbdefb; border-color: #1565c0; }
        .tab-filter-btn:hover { background: #141e36; }
        .log-group { background: #0f1d2e; border: 1px solid #1565c0; }
        .log-group.tab-main { background: transparent; border: none; }
        .log-group.tab-info { margin: 3px 0; background: #003169; border-color: #003169; }
        .bgm-summary.tab-info { background: #003169; color: #bbdefb; border-color: #003169; }
        .log-group.tab-other { background: #111; border-color: #1565c0; }
        .log-group.tab-other .text-col { color: #58749f !important; }
        .log-group.tab-custom { border-left: 2px solid var(--tab-color, #4fc3f7); }
        .tab-badge { background: #1565c0; color: #bbdefb; border: 1px solid #1e88e5; }
        .log-sep, .log-sep-outer { background: #1565c0; opacity: 0.5; }
      `;
    } else if (theme === 'sf') {
      themeCSS = `
        :root { --dice-success: #00ff66; --dice-fail: #ff3300; --dice-info: #00ffff; --accent-color: #00ffff; }
        body { background-color: #050510; }
        .ccfolia-log-wrapper { background: #050510; color: #00ffff; padding: 40px; font-family: 'Consolas', 'Courier New', monospace; line-height: 1.4; }
        .tab-filter-btn { background: #001a1a; color: #00ffff; border-color: #00ffff; border-radius: 0; box-shadow: 0 0 8px rgba(0,255,255,0.3); }
        .tab-filter-btn:hover { background: #003333; }
        .log-group { background: #080820; border: 1px solid #00ffff; border-radius: 0; }
        .log-group.tab-main { background: transparent; border: none; border-left: 2px solid rgba(0,255,255,0.5); padding-left: 10px; margin-left: 5px; }
        .log-group.tab-info { margin: 3px 0; background: #001a1a; border-color: #00ff66; color: #00ff66; }
        .bgm-summary.tab-info { background: #001a1a; color: #00ff66; border-color: #00ff66; }
        .log-group.tab-other { background: #0d0d18; border-color: #334455; color: #7799aa; }
        .log-group.tab-other .text-col { color: #7799aa !important; }
        .log-group.tab-custom { border-left: 2px solid var(--tab-color, #00ffff); }
        .tab-badge { background: var(--tab-color, #00ffff); color: #000; border-radius: 0; }
        .log-sep, .log-sep-outer { background: rgba(0,255,255,0.2); }
      `;
    } else if (theme === 'transdark') {
      themeCSS = `
        :root { --dice-success: #4ade80; --dice-fail: #ff6b6b; --dice-info: #a8b3ff; --accent-color: #a8b3ff; }
        body { background-color: #1e1e1e; }
        .ccfolia-log-wrapper { background: transparent; color: #eee; padding: 40px; font-family: 'Malgun Gothic', sans-serif; line-height: 1.4; }
        .tab-filter-btn { background: rgba(40,40,40,0.7); color: #eee; border-color: rgba(255,255,255,0.2); backdrop-filter: blur(4px); }
        .tab-filter-btn:hover { background: rgba(60,60,60,0.8); }
        .log-group { background: rgba(37, 37, 37, 0.5); }
        .log-group.tab-main { background: transparent; }
        .log-group.tab-info { margin: 3px 0; background: rgba(58, 63, 82, 0.5); }
        .bgm-summary.tab-info { background: rgba(58, 63, 82, 0.5); color: #eee; border-color: rgba(255,255,255,0.15); }
        .log-group.tab-other { background: rgba(74, 74, 74, 0.5); }
        .log-group.tab-other .text-col { color: #aaaaaa !important; }
        .log-group.tab-custom { border-left: 2px solid var(--tab-color, #888); }
        .tab-badge { background: rgba(0,0,0,0.5); color: #fff; }
        .log-sep, .log-sep-outer { background: rgba(255,255,255,0.1); }
      `;
    } else if (theme === 'translight') {
      themeCSS = `
        :root { --dice-success: #27ae60; --dice-fail: #c0392b; --dice-info: #2980b9; --accent-color: #2980b9; --edit-btn-bg: rgba(255, 255, 255, 0.9); --edit-btn-color: #555; }
        body { background-color: #f5f6fa; }
        .ccfolia-log-wrapper { background: transparent; color: #2c3e50; padding: 40px; font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; line-height: 1.4; }
        .tab-filter-btn { background: rgba(220,225,235,0.75); color: #2c3e50; border-color: rgba(150,160,180,0.5); backdrop-filter: blur(4px); }
        .tab-filter-btn:hover { background: rgba(200,208,220,0.85); }
        .log-group { background: rgba(255, 255, 255, 0.5); border: 1px solid rgba(220, 221, 225, 0.5); }
        .log-group.tab-main { background: transparent; border: none; }
        .log-group.tab-info { margin: 3px 0; background: rgba(240, 248, 255, 0.5); border-color: rgba(188, 224, 253, 0.5); }
        .bgm-summary.tab-info { background: rgba(240, 248, 255, 0.5); color: #2c3e50; border-color: rgba(188,224,253,0.5); }
        .log-group.tab-other { background: rgba(224, 224, 224, 0.5); border-color: rgba(204, 204, 204, 0.5); }
        .log-group.tab-other .text-col { color: #555 !important; }
        .log-group.tab-custom { border-left: 4px solid var(--tab-color, #888); }
        .tab-badge { background: var(--tab-color, #eee); color: #fff; }
        .log-sep, .log-sep-outer { background: rgba(234, 239, 242, 0.5); }
      `;
    } else if (theme === 'wedding') {
      themeCSS = `
        :root { --dice-success: #c0392b; --dice-fail: #8e5ea2; --dice-info: #2471a3; --accent-color: #BF4646; --edit-btn-bg: rgba(255, 255, 255, 0.9); --edit-btn-color: #555; }
        body { background-color: #FFF4EA; }
        .ccfolia-log-wrapper { background: #FFF4EA; color: #4a2c2c; padding: 40px; font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', Georgia, serif; line-height: 1.4; }
        .tab-filter-btn { background: #BF4646; color: #fff5f5; border-color: #8a2020; box-shadow: 0 2px 6px rgba(100,0,0,0.25); }
        .tab-filter-btn:hover { background: #a33a3a; }
        .log-group { background: #fff8f2; border: 1px solid #e8d5c4; }
        .log-group.tab-main { background: transparent; border: none; }
        .log-group.tab-info { margin: 3px 0; background: #BF4646; border-color: #BF4646; color: #fff5f5; }
        .bgm-summary.tab-info { background: #BF4646; color: #fff5f5; border-color: #8a2020; }
        .log-group.tab-info .text-col { color: #fff5f5 !important; }
        .log-group.tab-other { background: #7EACB5; border-color: #6096a0; color: #fff; }
        .log-group.tab-other .text-col { color: #f0f8fa !important; }
        .log-group.tab-custom { border-left: 4px solid var(--tab-color, #BF4646); }
        .tab-badge { background: var(--tab-color, #BF4646); color: #fff; }
        .log-sep, .log-sep-outer { background: #e8d5c4; }
      `;
    } else if (theme === 'void') {
      themeCSS = `
        :root { --dice-success: #1a6fd4; --dice-fail: #e74c3c; --dice-info: #f85b23; --accent-color: #2f5d70; }
        body { background-color: #e6dd00; }
        .ccfolia-log-wrapper { background: #e6dd00; color: #2f5d70; padding: 40px; font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; line-height: 1.4; }
        .tab-filter-btn { background: #2f5d70; color: #e6dd00; border-color: #1d3d4d; }
        .tab-filter-btn:hover { background: #1d3d4d; }
        .log-group { background: #d4cc00; border: 1px solid #b8b000; border-radius: 0 !important; }
        .log-group.tab-main { background: transparent; border: none; border-radius: 0 !important; }
        .log-group.tab-main .text-col { color: #2f5d70 !important; }
        .log-group.tab-info { margin: 3px 0; background: #f85b23; border-color: #f85b23; color: #fff; border-radius: 0 !important;
          clip-path: polygon(14px 0%, 100% 0%, 100% 100%, 0% 100%, 0% 14px); }
        .log-group.tab-info .name-col { color: #e6dd00 !important; }
        .log-group.tab-info .text-col { color: #fff !important; }
        .bgm-summary.tab-info { background: #2f5d70; color: #ffff00; border-color: #1d3d4d; }
        .log-group.tab-other { background: #2f5d70; border-color: #1d3d4d; border-radius: 0 !important; }
        .log-group.tab-other .text-col { color: #fff !important; }
        .log-group.tab-custom { border-left: 4px solid var(--tab-color, #2f5d70); border-radius: 0 !important; }
        .tab-badge { background: #2f5d70; color: #e6dd00; border-radius: 0; }
        .log-sep, .log-sep-outer { background: #2f5d70; opacity: 0.3; }
      `;
    } else if (theme === 'suibokuga') {
      themeCSS = `
        :root { --dice-success: #4a7c4a; --dice-fail: #8b3a3a; --dice-info: #555; --accent-color: #333; --edit-btn-bg: rgba(255, 255, 255, 0.9); --edit-btn-color: #555; }
        body { background-color: #f7f4ef; }
        .ccfolia-log-wrapper { background: #f7f4ef; color: #1a1a1a; padding: 40px; font-family: 'Noto Serif JP', 'Yu Mincho', serif; line-height: 1.8; }
        .tab-filter-btn { background: #e8e0d5; color: #333; border-color: #b0a898; }
        .tab-filter-btn:hover { background: #ddd5c8; }
        .log-group { background: #ede8e0; border: 1px solid #c8bfb0; }
        .log-group.tab-main { background: transparent; border: none; }
        .log-group.tab-info { margin: 3px 0; background: #e8e0d5; border-color: #8a7a6a; }
        .bgm-summary.tab-info { background: #e8e0d5; color: #333; border-color: #8a7a6a; }
        .log-group.tab-other { background: #ede8e0; border-color: #b0a898; }
        .log-group.tab-other .text-col { color: #888 !important; }
        .log-group.tab-custom { border-left: 3px solid var(--tab-color, #4a7c4a); }
        .tab-badge { background: var(--tab-color, #555); color: #f7f4ef; }
        .log-sep, .log-sep-outer { background: #8a7a6a; opacity: 0.35; }
      `;
    } else if (theme === 'terminal') {
      themeCSS = `
        :root { --dice-success: #00ff41; --dice-fail: #ff4444; --dice-info: #00cc33; --accent-color: #00ff41; }
        body { background-color: #0d0d0d; }
        .ccfolia-log-wrapper { background: #0d0d0d; color: #00ff41; padding: 40px; font-family: 'Consolas', 'Courier New', monospace; line-height: 1.6; }
        .tab-filter-btn { background: #0a1a0a; color: #00ff41; border-color: #00aa2a; border-radius: 0; }
        .tab-filter-btn:hover { background: #0d2a0d; }
        .log-group { background: #0a140a; border: 1px solid #00aa2a; border-radius: 0 !important; }
        .log-group.tab-main { background: transparent; border: none; }
        .log-group.tab-info { margin: 3px 0; background: #0a2a0a; border-color: #00ff41; border-radius: 0 !important; }
        .bgm-summary.tab-info { background: #0a2a0a; color: #00ff41; border-color: #00ff41; }
        .log-group.tab-other { background: #111; border-color: #005a15; border-radius: 0 !important; }
        .log-group.tab-other .text-col { color: #007a1f !important; }
        .log-group.tab-custom { border-left: 2px solid var(--tab-color, #00ff41); border-radius: 0 !important; }
        .tab-badge { background: var(--tab-color, #00aa2a); color: #0d0d0d; border-radius: 0; font-family: monospace; }
        .name-col { color: #00cc33 !important; }
        .log-sep, .log-sep-outer { background: #00aa2a; opacity: 0.4; }
      `;
    } else if (theme === 'pink') {
      themeCSS = `
        :root { --dice-success: #e91e8c; --dice-fail: #c2185b; --dice-info: #f06292; --accent-color: #e91e8c; }
        body { background-color: #fff0f5; }
        .ccfolia-log-wrapper { background: #fff0f5; color: #4a1535; padding: 40px; font-family: 'Malgun Gothic', sans-serif; line-height: 1.5; }
        .tab-filter-btn { background: #ffd6e7; color: #880e4f; border-color: #f48fb1; }
        .tab-filter-btn:hover { background: #ffb6c1; }
        .log-group { background: #ffe4ec; border: 1px solid #f8bbd0; }
        .log-group.tab-main { background: transparent; border: none; }
        .log-group.tab-info { margin: 3px 0; background: #ffb6c1; border-color: #f48fb1; }
        .bgm-summary.tab-info { background: #ffb6c1; color: #880e4f; border-color: #f48fb1; }
        .log-group.tab-other { background: #ffe4ec; border-color: #f8bbd0; }
        .log-group.tab-other .text-col { color: #c77a9a !important; }
        .log-group.tab-custom { border-left: 2px solid var(--tab-color, #e91e8c); }
        .tab-badge { background: var(--tab-color, #e91e8c); color: #fff; }
        .log-sep, .log-sep-outer { background: #f48fb1; opacity: 0.6; }
      `;
    } else if (theme === 'pastel') {
      themeCSS = `
        :root { --dice-success: #6a9f6a; --dice-fail: #c97b84; --dice-info: #7a9fc9; --accent-color: #9b7ec9; }
        body { background-color: #f9f5ff; }
        .ccfolia-log-wrapper { background: #f9f5ff; color: #3a2d4a; padding: 40px; font-family: 'Malgun Gothic', sans-serif; line-height: 1.5; }
        .tab-filter-btn { background: #ede0ff; color: #5a3d7a; border-color: #c9a8f0; }
        .tab-filter-btn:hover { background: #e0ccff; }
        .log-group { background: #f0e8ff; border: 1px solid #dcc8f5; }
        .log-group.tab-main { background: transparent; border: none; }
        .log-group.tab-info { margin: 3px 0; background: #e8d5fb; border-color: #c9a8f0; }
        .bgm-summary.tab-info { background: #e8d5fb; color: #5a3d7a; border-color: #c9a8f0; }
        .log-group.tab-other { background: #eef5ff; border-color: #c8ddf5; }
        .log-group.tab-other .text-col { color: #8a9abf !important; }
        .log-group.tab-custom { border-left: 2px solid var(--tab-color, #9b7ec9); }
        .tab-badge { background: var(--tab-color, #9b7ec9); color: #fff; }
        .log-sep, .log-sep-outer { background: #c9a8f0; opacity: 0.5; }
      `;
    } else {
      themeCSS = `
        :root { --dice-success: #4ade80; --dice-fail: #ff6b6b; --dice-info: #a8b3ff; --accent-color: #e74c3c; }
        body { background-color: #1e1e1e; }
        .ccfolia-log-wrapper { background: #1e1e1e; color: #eee; padding: 40px; font-family: 'Malgun Gothic', sans-serif; line-height: 1.4; }
        .tab-filter-btn { background: #2a2a2a; color: #ccc; border-color: #555; }
        .tab-filter-btn:hover { background: #3a3a3a; }
        .log-group { background: #252525; }
        .log-group.tab-main { background: transparent; }
        .log-group.tab-info { margin: 3px 0; background: #3A3F52; }
        .bgm-summary.tab-info { background: #3A3F52; color: #eee; border-color: rgba(255,255,255,0.15); }
        .log-group.tab-other { background: #4a4a4a; }
        .log-group.tab-other .text-col { color: #aaaaaa !important; }
        .log-group.tab-custom { border-left: 2px solid var(--tab-color, #888); }
        .tab-badge { background: rgba(0,0,0,0.5); color: #fff; }
        .log-sep, .log-sep-outer { background: rgba(255,255,255,0.1); }
      `;
    }

    // Custom Fonts Injection
    let fontImportCSS = '';
    let fontFamilyOverride = '';
    if (fontSetting && fontSetting.type === 'web') {
      if (fontSetting.fontFaceCSS) {
        fontImportCSS = fontSetting.fontFaceCSS;
      } else {
        const url = fontSetting.importUrl || `https://fonts.googleapis.com/css2?family=${((fontSetting.family || '').replace(/ /g, '+'))}&subset=korean&display=swap`;
        fontImportCSS = `@import url('${url}');`;
      }
      if (fontSetting.family) {
        const fam = `'${fontSetting.family}', sans-serif`;
        themeCSS = themeCSS.replace(/font-family\s*:[^;}"]+/g, `font-family: ${fam}`);
        baseCSS  = baseCSS .replace(/font-family\s*:[^;}"]+/g, `font-family: ${fam}`);
        fontFamilyOverride = `* { font-family: ${fam} !important; }`;
      }
    } else if (fontSetting && fontSetting.type === 'system' && fontSetting.family) {
      const fam = fontSetting.family;
      themeCSS = themeCSS.replace(/font-family\s*:[^;}"]+/g, `font-family: ${fam}`);
      baseCSS  = baseCSS .replace(/font-family\s*:[^;}"]+/g, `font-family: ${fam}`);
      fontFamilyOverride = `* { font-family: ${fam} !important; }`;
    }

    let html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TRPG Log</title>
  ${(() => {
    if (!fontImportCSS) return '';
    if (fontImportCSS.startsWith('@font-face')) return `<style>${fontImportCSS}</style>`;
    const m = fontImportCSS.match(/url\(['"]?([^'")\s]+)['"]?\)/);
    return m ? `<link rel="stylesheet" href="${m[1]}">` : '';
  })()}
  <style>
    ${baseCSS}
    ${themeCSS}
    .log-entry.dice-success .text-col, .log-group .log-entry.dice-success .text-col { color: var(--dice-success) !important; }
    .log-entry.dice-fail .text-col, .log-group .log-entry.dice-fail .text-col { color: var(--dice-fail) !important; }
    ${fontFamilyOverride}
  </style>
</head>
  ${(() => {
    let bodyClasses = [];
    if (showIcons) bodyClasses.push('has-icons');
    if (isEditing) bodyClasses.push('is-editing');
    const classAttr = bodyClasses.length > 0 ? ` class="${bodyClasses.join(' ')}"` : '';
    return `<body${classAttr}>`;
  })()}
  ${checkboxesHTML}
  <input type="checkbox" id="chk-toggle">
  <label for="chk-toggle" class="tab-filter-btn">탭 표시/숨김</label>
  <div class="tab-filter-menu">
    <div class="tab-filter-title">표시할 탭 선택</div>
    ${labelsHTML}
  </div>
  <div class="ccfolia-log-wrapper"><div class="log-container">`;

    const colors = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6'];
    const BGM_RE = /^\*\s(.+?)\s\|\s(https?:\/\/\S+)/;
    const bgmList = [];
    
    parsedLogs.forEach(log => {
      const match = BGM_RE.exec(log.text ? log.text.trim() : '');
      if (match) {
        bgmList.push({ label: match[1], url: match[2] });
        log._isBGM = true; log._bgmLabel = match[1]; log._bgmUrl = match[2];
      }
    });

    function renderGroup(tab, logs) {
      if (logs.length === 0) return '';
      const t = (tab || 'main').toLowerCase();
      let groupClass = 'tab-custom';
      let isCustom = false;
      if (t === '메인' || t === 'system') groupClass = 'tab-main';
      else if (t === '잡담') groupClass = 'tab-other';
      else if (t === 'info' || t === '정보') groupClass = 'tab-info';
      else isCustom = true;
      
      let styleAttr = '';
      if (isCustom) {
        const hash = tab.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
        const color = colors[hash % colors.length];
        styleAttr = `style="--tab-color: ${color};"`;
      }
      
      let res = `<div class="log-group ${groupClass}" data-tab-idx="${getTabIdx(tab)}" ${styleAttr}>`;
      if (isCustom) res += `<div class="tab-badge">${escapeHtml(tab)}</div>`;
      let prevName = null;
      let prevAvatar = null;
      
      logs.forEach((log) => {
        // Find matching parsedLogs global index to link back edits
        const globalIdx = parsedLogs.indexOf(log);
        
        const isSystemEntry = (log.name?.toLowerCase() === 'system');
        
        // Character Config Overrides (Name Color & Avatar URL)
        const charOverride = charSettings[log.name] || {};
        let nameColor = charOverride.color || log.color || 'inherit';
        if (nameColor !== 'inherit') nameColor = colorToHex(nameColor);
        
        // Match cocoroke: Each chat message uses its own iconUrl (per-chat expression/standing)
        let avatarUrl = log.iconUrl || null;
        if (charOverride._manual && charOverride.avatar) {
          avatarUrl = charOverride.avatar.trim();
        } else if (!avatarUrl && charOverride.avatar) {
          avatarUrl = charOverride.avatar.trim();
        }

        // Check if this speaker should be formatted as a Narrator (only in the Main tab)
        const isMainTab = tab === '메인' || (tab && tab.toLowerCase() === 'main');
        const isNarrator = isMainTab && narrators.includes(log.name);

        // Merge only if both speaker name AND avatar image are identical
        let isMerged = !isNarrator && (log.name === prevName && avatarUrl === prevAvatar);
        if (prevName !== null && !isMerged) res += `<div class="log-sep"></div>`;

        if (isSystemEntry) nameColor = 'var(--accent-color)';
        if (theme === 'light' || theme === 'translight') {
          const c = nameColor.toLowerCase().replace(/\s/g, '');
          if (c === '#fff' || c === '#ffffff' || c === '#e0e0e0' || c === '#eee' || c === '#eeeeee' || c === 'white' || c === 'rgb(255,255,255)') nameColor = '#2c3e50';
        }
        
        let textColor = 'inherit';
        if (log.hasDice && log.isSuccess) textColor = 'var(--dice-success)';
        else if (log.hasDice && log.isFailure) textColor = 'var(--dice-fail)';
        else if (log.hasDice) textColor = 'var(--dice-info)';
        
        let displayText;
        if (log._isBGM) {
          displayText = `<a class="bgm-inline-link" href="${escapeHtml(log._bgmUrl)}" target="_blank" rel="noopener noreferrer">🎵 ${escapeHtml(log._bgmLabel)}</a>`;
        } else {
          displayText = escapeHtml(log.text);
          if (!log.isSuccess && !log.isFailure) {
            displayText = displayText.replace(/(\d+[dD]\d+)/g, '<span style="color:var(--dice-info); font-weight:bold;">$1</span>');
            displayText = displayText.replace(/→\s*(\d+)/g, '→ <span style="color:var(--dice-info); font-weight:bold;">$1</span>');
            displayText = displayText.replace(/\[(\d+(?:,\s*\d+)*)\]/g, '<span style="color:var(--dice-info); font-weight:bold;">[$1]</span>');
          }
        }
        
        let avatarHtml = "";
        const isInfoTab = (groupClass === 'tab-info');
        const isSystemTab = (log.name?.toLowerCase() === 'system');
        
        if (showIcons && !isInfoTab && !isNarrator) {
          if (isSystemTab) avatarHtml = `<div class="avatar-img" style="visibility:hidden;"></div>`;
          else if (!isMerged && avatarUrl) avatarHtml = `<img src="${escapeHtml(avatarUrl)}" class="avatar-img">`;
          else if (!isMerged && !avatarUrl) avatarHtml = `<div class="avatar-img" style="background:#444;"></div>`;
          else avatarHtml = `<div style="width:24px; height:24px; flex-shrink:0;"></div>`;
        }
        
        let nameHtml = "";
        if (!isNarrator) {
          nameHtml = isMerged ? `<div class="name-col"></div>` : `<div class="name-col" style="color:${nameColor}">${avatarHtml}<span${isEditing ? ' contenteditable="true"' : ''}>${escapeHtml(log.name)}</span></div>`;
        }
        
        let entryClass = `log-entry${log.hasDice && log.isSuccess ? ' dice-success' : log.hasDice && log.isFailure ? ' dice-fail' : ''}`;
        if (isNarrator) {
          entryClass += ' narration-entry';
        }
        
        let entryStyle = isMerged && !isNarrator ? (showIcons ? `` : `margin-top: 7px;`) : ``;
        const textColStyle = (log.hasDice && (log.isSuccess || log.isFailure))
          ? `style="color:${textColor} !important"`
          : `style="color:${textColor}"`;
          
        let editControlsHtml = '';
        if (isEditing) {
          editControlsHtml = `
            <div class="edit-controls-wrapper">
              <button class="edit-ctrl-btn btn-move-up" data-idx="${globalIdx}" title="위로 이동">▲</button>
              <button class="edit-ctrl-btn btn-move-down" data-idx="${globalIdx}" title="아래로 이동">▼</button>
              <button class="edit-ctrl-btn btn-edit-text" data-idx="${globalIdx}" title="메시지 수정">✎</button>
              <button class="edit-ctrl-btn btn-add-after" data-idx="${globalIdx}" title="이 아래에 새 채팅 추가">＋</button>
              <button class="edit-ctrl-btn btn-delete" data-idx="${globalIdx}" title="이 채팅 삭제">✕</button>
            </div>
          `;
        }
        res += `<div class="${entryClass}" style="${entryStyle}" data-idx="${globalIdx}">${nameHtml}<div class="text-col" ${textColStyle}${isEditing ? ' contenteditable="true"' : ''}>${displayText}</div>${editControlsHtml}</div>`;
        
        // Prev name and avatar are tracked for merge
        prevName = isNarrator ? null : log.name;
        prevAvatar = isNarrator ? null : avatarUrl;
      });
      res += `</div>`;
      return res;
    }

    const groups = [];
    parsedLogs.forEach(log => {
      const t = log.tab || '메인';
      const isSystem = log.name?.toLowerCase() === 'system';
      const last = groups[groups.length - 1];
      if (groups.length === 0 || last.tab !== t || isSystem || last.isSystem) {
        groups.push({ tab: t, logs: [log], isSystem });
      } else {
        last.logs.push(log);
      }
    });

    const isMain = (t) => t === '메인';

    groups.forEach((g, i) => {
      html += renderGroup(g.tab, g.logs);
      if (i < groups.length - 1) {
        const nextTab = groups[i + 1].tab;
        const curIsSystem = g.tab === 'system';
        const nextIsSystem = nextTab === 'system';

        if (curIsSystem && nextIsSystem) {
          // system to system, no divider
        } else if (curIsSystem && !nextIsSystem) {
          if (isMain(nextTab)) {
            html += `<div class="log-sep-outer" style="display:block"></div>`;
          } else {
            html += `<div class="log-sep-outer" style="display:block" data-next-tab-idx="${getTabIdx(nextTab)}"></div>`;
          }
        } else if (!curIsSystem && nextIsSystem) {
          if (isMain(g.tab)) {
            html += `<div class="log-sep-outer" style="display:block"></div>`;
          } else {
            html += `<div class="log-sep-outer" style="display:block" data-after-tab-idx="${getTabIdx(g.tab)}"></div>`;
          }
        } else if (isMain(g.tab) || isMain(nextTab)) {
          html += `<div class="log-sep-outer" data-after-tab-idx="${getTabIdx(g.tab)}" data-next-tab-idx="${getTabIdx(nextTab)}"></div>`;
        }
      }
    });

    if (bgmList.length > 0) {
      const seenLabels = new Set();
      const dedupedBgmList = bgmList.filter(b => {
        if (seenLabels.has(b.label)) return false;
        seenLabels.add(b.label);
        return true;
      });
      let bgmItemsHtml = dedupedBgmList.map((b, i) =>
        `<li><a class="bgm-list-link" href="${escapeHtml(b.url)}" target="_blank" rel="noopener noreferrer">${i + 1}. ${escapeHtml(b.label)}</a></li>`
      ).join('');
      const bgmBlock = `<div class="bgm-container"><details class="bgm-summary tab-info"><summary class="bgm-summary-title"><span>🎵 이번 세션 BGM (${dedupedBgmList.length})</span><span style="font-size:12px; opacity:0.7;">▼</span></summary><ul class="bgm-list">${bgmItemsHtml}</ul></details></div>`;
      html = html.replace('<div class="ccfolia-log-wrapper"><div class="log-container">', `<div class="ccfolia-log-wrapper"><div class="log-container">${bgmBlock}`);
    }

    html += `</div></div></body></html>`;
    return html;
  }

  // --- LOG ANALYZER ENGINE ---
  function analyzeLogData(logs) {
    const characters = {};
    let timeline = null;
    const chatCounts = {};
    if (logs.length > 0 && logs[0].createdAt) {
      const chunks = [];
      let currentChunk = null;
      logs.forEach(log => {
        if (!log.createdAt) return;
        const logTime = new Date(log.createdAt);
        if (isNaN(logTime.getTime())) return;
        if (!currentChunk) { currentChunk = { start: logTime, end: logTime }; }
        else {
          const diffMs = logTime.getTime() - currentChunk.end.getTime();
          if (diffMs > 30 * 60 * 1000) { chunks.push(currentChunk); currentChunk = { start: logTime, end: logTime }; }
          else { currentChunk.end = logTime; }
        }
      });
      if (currentChunk) chunks.push(currentChunk);
      const groupedByDate = {};
      let totalMs = 0;
      const pad = (n) => String(n).padStart(2, '0');
      const formatDate = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
      const formatTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
      chunks.forEach(chunk => {
        const diffMs = chunk.end.getTime() - chunk.start.getTime();
        totalMs += diffMs;
        const dateStr = formatDate(chunk.start);
        if (!groupedByDate[dateStr]) groupedByDate[dateStr] = [];
        groupedByDate[dateStr].push({ startTime: formatTime(chunk.start), endTime: formatTime(chunk.end), durationMs: diffMs });
      });
      timeline = { totalMs, groupedByDate };
    }
    logs.forEach((log) => {
      const tabName = (log.tab || '').toLowerCase().trim();
      const speakerName = log.name || 'System';
      const isInfoTab = tabName === 'info' || tabName === '정보';
      if (isInfoTab) return;
      if (!chatCounts[tabName]) chatCounts[tabName] = {};
      if (!chatCounts[tabName][speakerName]) chatCounts[tabName][speakerName] = 0;
      chatCounts[tabName][speakerName]++;
      const isMainTab = tabName === 'main' || tabName === '메인';
      if (!isMainTab) return;
      const text = log.text || '';
      if (!text || !speakerName) return;
      const endMatch = text.match(/(성공|실패|대성공|크리티컬|펌블|success|failure|critical|fumble)[\s!?.]*$/i);
      if (!endMatch) return;
      let skillName = "기본 판정";
      const allMatches = [...text.matchAll(/(?:\[|【)\s*(.*?)\s*(?:\]|】)/g)];
      const validMatch = allMatches.find(m => !/^\d+$/.test(m[1].trim()));
      if(validMatch) skillName = validMatch[1].trim();
      const result = endMatch[1];
      if (!characters[speakerName]) characters[speakerName] = { successes: [], successDetails: [], attempts: 0, successCount: 0 };
      characters[speakerName].attempts++;
      if (/(성공|대성공|크리티컬|success|critical)/i.test(result)) {
        characters[speakerName].successCount++;
        if (!characters[speakerName].successes.includes(skillName)) characters[speakerName].successes.push(skillName);
        characters[speakerName].successDetails.push({ skill: skillName, text: text });
      }
    });
    Object.keys(characters).forEach(char => {
      if (characters[char].attempts > 0) characters[char].successRate = Math.round((characters[char].successCount / characters[char].attempts) * 100);
    });
    return { characters, timeline, chatCounts };
  }

  function generateAnalysisHTML({ characters, timeline, chatCounts }) {
    const msToHoursMins = (ms) => {
      const totalMins = Math.floor(ms / 60000);
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      if (h === 0 && m === 0) return '1분 미만';
      if (h === 0) return `${m}분`;
      return `${h}시간 ${m}분`;
    };
    let timelineHtml = '';
    if (timeline && Object.keys(timeline.groupedByDate).length > 0) {
      let datesHtml = '';
      for (const [dateStr, chunks] of Object.entries(timeline.groupedByDate)) {
        let dailyTotalMs = chunks.reduce((acc, c) => acc + c.durationMs, 0);
        let chunkListHtml = chunks.map(c => `<li style="color:#aaa; margin-bottom:4px;"><span style="display:inline-block; width:110px; color:#eee;">${c.startTime} ~ ${c.endTime}</span><span style="color:#ccc; font-size:12px;">(${msToHoursMins(c.durationMs)})</span></li>`).join('');
        datesHtml += `<div style="margin-bottom:16px; margin-top: 10px;"><div style="font-weight:bold; color:#e74c3c; margin-bottom:8px; border-bottom:1px solid #333; padding-bottom:4px;">📅 ${dateStr} <span style="font-size:12px; color:#888; font-weight:normal; margin-left:8px;">(당일 총 ${msToHoursMins(dailyTotalMs)})</span></div><ul style="list-style:none; padding-left:10px; margin:0;">${chunkListHtml}</ul></div>`;
      }
      timelineHtml = `<details class="character-card" style="border-color:#2a2a2a; margin-bottom: 16px;"><summary class="character-header" style="cursor:pointer; margin-bottom: 0;"><div style="flex: 1; display:flex; justify-content:space-between; align-items:center;"><div class="character-name" style="color:#fff; margin-bottom:0;">⏳ 세션 플레이 타임라인</div><span class="toggle-icon" style="color:#fff;">▼</span></div></summary><div style="color:#fff; font-size:13px; margin-top:15px;">총 누적 플레이 타임 : <span style="color:#fff; font-weight:bold; font-size:16px;">${msToHoursMins(timeline.totalMs)}</span></div>${datesHtml}</details>`;
    }
    let chatCountHtml = '';
    if (chatCounts && Object.keys(chatCounts).length > 0) {
      chatCountHtml += `<details class="character-card" style="border-color:#2a2a2a; margin-bottom: 16px;"><summary class="character-header" style="cursor:pointer; margin-bottom: 0;"><div style="flex: 1; display:flex; justify-content:space-between; align-items:center;"><div class="character-name" style="color:#fff; margin-bottom:0;">💬 탭별 발화량 (채팅 횟수)</div><span class="toggle-icon" style="color:#fff;">▼</span></div></summary><div style="display:flex; flex-direction:column; gap:10px; margin-top:15px;">`;
      for (const [tab, speakers] of Object.entries(chatCounts)) {
        chatCountHtml += `<div style="background:#222; padding:10px; border-radius:6px; border:1px solid #333;"><div style="font-weight:bold; color:#f1c40f; margin-bottom:8px;">[${escapeHtml(tab)}]</div><div style="display:flex; flex-wrap:wrap; gap:8px;">`;
        Object.entries(speakers).sort((a,b) => b[1] - a[1]).forEach(([speaker, count]) => {
          chatCountHtml += `<span style="background:#1a1a1a; border:1px solid #444; padding:4px 10px; border-radius:15px; font-size:13px; color:#ddd;"><span style="color:#2ecc71; font-weight:bold;">${escapeHtml(speaker)}</span> : ${count}회</span>`;
        });
        chatCountHtml += `</div></div>`;
      }
      chatCountHtml += `</div></details>`;
    }
    let html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>코코포리아 로그 분석</title><style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { background-color: #0f0f0f; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; min-height: 100vh; }
      .container { max-width: 1200px; margin: 0 auto; }
      .header { text-align: center; margin-bottom: 32px; }
      .header h1 { font-size: 42px; font-weight: bold; color: #e74c3c; margin-bottom: 8px; }
      .header p { color: #888; font-size: 16px; }
      .character-card { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; padding: 24px; margin-bottom: 16px; }
      .character-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; cursor: default; list-style:none; }
      .character-header::-webkit-details-marker { display: none; }
      .character-name { font-size: 18px; font-weight: bold; color: #e74c3c; margin-bottom: 12px; }
      .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; font-size: 14px; }
      .stat-box { background: #222; border-radius: 6px; padding: 8px; border: 1px solid #2a2a2a; }
      .stat-label { color: #888; font-size: 12px; }
      .stat-value { color: white; font-weight: 600; margin-top: 4px; }
      .success-count { text-align: right; }
      .success-count-number { font-size: 32px; font-weight: bold; color: #e74c3c; }
      .success-count-label { font-size: 12px; color: #888; }
      .skills-box { background: #222; border-radius: 8px; padding: 16px; margin-bottom: 16px; border: 1px solid #2a2a2a; }
      .skills-label { font-size: 12px; color: #888; margin-bottom: 8px; }
      .skills-list { display: flex; flex-wrap: wrap; gap: 8px; }
      .skill-tag { background: rgba(231, 76, 60, 0.2); border: 1px solid rgba(231, 76, 60, 0.5); color: #e74c3c; font-size: 14px; padding: 6px 12px; border-radius: 20px; }
      .progress-bar { background: #222; border-radius: 9999px; height: 8px; overflow: hidden; margin-bottom: 16px; }
      .progress-fill { background: linear-gradient(to right, #e74c3c, #c0392b); height: 100%; }
      details.details-section-accordion summary { margin-bottom:10px; color:#888; font-size:13px; padding:10px; background:#222; border-radius:6px; border:1px solid #2a2a2a; cursor:pointer; display:flex; justify-content:space-between; align-items:center; list-style:none; user-select:none; }
      details.details-section-accordion summary::-webkit-details-marker { display: none; }
      details[open] .toggle-icon { transform: rotate(180deg); }
      .detail-item { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 6px; padding: 12px; margin-bottom: 8px; font-size: 13px; }
      .detail-skill { color: #e74c3c; font-weight: bold; margin-bottom: 4px; }
      .detail-text { color: #aaa; word-break: break-word; }
      .toggle-icon { display: inline-block; transition: transform 0.3s; margin-left: 8px; font-size: 14px; }
    </style></head><body><div class="container" id="captureArea">
      <div class="header"><h1>📊 코코포리아 로그 분석</h1><p>캐릭터별 성공 기능 분석 결과 (상세 내역 바를 클릭하여 접고 펼치세요)</p></div>
      ${timelineHtml}${chatCountHtml}`;
      
    if (Object.keys(characters).length === 0) {
      html += `<div style="text-align:center; padding: 60px;"><h2>❌ 판정 데이터를 찾을 수 없습니다</h2></div>`;
    } else {
      Object.entries(characters).forEach(([character, data]) => {
        const skillsHtml = data.successes.length > 0 ? data.successes.map(skill => `<span class="skill-tag">${escapeHtml(skill)}</span>`).join('') : `<span style="color:#555">성공한 기능 없음</span>`;
        let detailsHtml = '';
        if (data.successDetails && data.successDetails.length > 0) {
          detailsHtml += `<details class="details-section-accordion"><summary><span>성공 세부 내역 (${data.successDetails.length}건)</span><span class="toggle-icon">▼</span></summary><div style="margin-top:10px;">`;
          data.successDetails.forEach(detail => {
            detailsHtml += `<div class="detail-item"><div class="detail-skill">✓ ${escapeHtml(detail.skill)}</div><div class="detail-text">${escapeHtml(detail.text)}</div></div>`;
          });
          detailsHtml += `</div></details>`;
        }
        
        html += `
        <div class="character-card">
          <div class="character-header">
            <div>
              <div class="character-name">${escapeHtml(character)}</div>
            </div>
            <div class="success-count">
              <div class="success-count-number">${data.successCount}</div>
              <div class="success-count-label">총 판정 성공 횟수</div>
            </div>
          </div>
          
          <div class="stats-grid">
            <div class="stat-box">
              <div class="stat-label">판정 시도</div>
              <div class="stat-value">${data.attempts}회</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">성공</div>
              <div class="stat-value">${data.successCount}회</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">판정 성공률</div>
              <div class="stat-value">${data.successRate}%</div>
            </div>
          </div>
          
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${data.successRate}%"></div>
          </div>
          
          <div class="skills-box">
            <div class="skills-label">성공한 기능</div>
            <div class="skills-list">
              ${skillsHtml}
            </div>
          </div>
          
          ${detailsHtml}
        </div>
        `;
      });
    }

    html += `</div></body></html>`;
    return html;
  }
})();
