/**
 * 테마 변경 및 관리 기능을 처리하는 모듈
 */
const ThemeManager = (() => {
  const bodyElement = document.body;
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  
  /**
   * 라이트/다크 모드 전환
   * @param {string} theme - 'light' 또는 'dark'
   */
  function setTheme(theme) {
    if (theme === 'dark') {
      bodyElement.classList.remove('light-mode');
      bodyElement.classList.add('dark-mode');
      themeIcon.src = 'icons/light-mode.svg';
      themeIcon.alt = '라이트 모드';
    } else {
      bodyElement.classList.remove('dark-mode');
      bodyElement.classList.add('light-mode');
      themeIcon.src = 'icons/dark-mode.svg';
      themeIcon.alt = '다크 모드';
    }
  }

  /**
   * 테마 토글 이벤트 초기화
   * @param {Function} saveSettingsCallback - 설정 저장 콜백 함수
   */
  function initThemeToggle(saveSettingsCallback) {
    themeToggle.addEventListener('click', () => {
      const isDarkMode = bodyElement.classList.contains('dark-mode');
      const newTheme = isDarkMode ? 'light' : 'dark';
      
      setTheme(newTheme);
      saveSettingsCallback({ theme: newTheme });
    });
  }

  return {
    setTheme,
    initThemeToggle
  };
})();