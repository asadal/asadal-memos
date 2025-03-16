/**
 * 메인 애플리케이션 로직을 관리하는 모듈
 */
document.addEventListener("DOMContentLoaded", async () => {
  const memoContent = document.getElementById("memo-content");
  const fontFamilySelector = document.getElementById("font-family-selector");
  const fontSizeButtons = document.querySelectorAll(".font-size-btn");
  const downloadBtn = document.getElementById("download-btn");
  const tabButtons = document.querySelectorAll(".tab-btn");

  let settings = await MemoStorage.loadSettings();
  let isTyping = false;
  let typingTimer;
  let currentTabId = 1; // 현재 탭 ID를 직접 관리

  // 전역 설정 적용 (테마)
  applyGlobalSettings(settings);

  // 테마 변경 버튼 초기화
  ThemeManager.initThemeToggle(updateGlobalSettings);

  // 최초 탭 데이터 및 탭별 설정 로드
  await loadTabContent(currentTabId);

  // 탭 버튼 클릭 이벤트
  tabButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const newTabId = parseInt(button.dataset.tab);
      if (newTabId === currentTabId) return;

      // 현재 탭 내용 저장
      await saveCurrentMemo(currentTabId);

      // 탭 UI 업데이트
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      // 새 탭 내용 및 설정 로드
      currentTabId = newTabId;
      await loadTabContent(currentTabId);
    });
  });

  // 메모 내용 입력 이벤트
  memoContent.addEventListener("input", () => {
    // 타이핑 타이머 초기화
    clearTimeout(typingTimer);
    isTyping = true;

    // 타이핑이 0.5초 동안 없을 때 하이퍼링크 변환 및 저장
    typingTimer = setTimeout(async () => {
      isTyping = false;
      // 현재 커서 위치 저장
      const selection = window.getSelection();
      const range = selection.getRangeAt(0);

      // 링크 변환 적용
      const originalHtml = memoContent.innerHTML;
      memoContent.innerHTML = TextUtils.linkify(originalHtml);

      // 커서 위치 복원 시도
      try {
        selection.removeAllRanges();
        selection.addRange(range);
      } catch (e) {
        console.log("커서 위치 복원 실패");
      }

      // 저장
      await saveCurrentMemo(currentTabId);
    }, 500);
  });

  // 링크 클릭 이벤트 처리
  memoContent.addEventListener("click", TextUtils.handleLinkClick);

  // 탭 콘텐츠 및 설정 로드 함수
  async function loadTabContent(tabId) {
    try {
      // 메모 내용 로드
      const memoText = await MemoStorage.loadMemo(tabId);
      // 이미 저장된 HTML을 그대로 표시 (이미 링크가 변환되어 있음)
      memoContent.innerHTML = memoText || "";

      // 탭별 설정 로드 및 적용
      const tabSettings = await MemoStorage.loadTabSettings(tabId);
      applyTabSettings(tabSettings);
    } catch (error) {
      console.error(`탭 ${tabId} 데이터 로드 중 오류:`, error);
      memoContent.innerHTML = "";
    }
  }

  // 현재 탭의 메모 내용 저장
  async function saveCurrentMemo(tabId) {
    try {
      const content = memoContent.innerHTML;
      await MemoStorage.saveMemo(tabId, content);
    } catch (error) {
      console.error(`탭 ${tabId} 데이터 저장 중 오류:`, error);
    }
  }

  // 선택 텍스트 자동 복사
  memoContent.addEventListener("mouseup", TextUtils.copySelectedText);

  // 폰트 패밀리 변경 이벤트 - 탭별 설정 저장
  fontFamilySelector.addEventListener("change", async () => {
    const fontFamily = fontFamilySelector.value;
    memoContent.style.fontFamily = fontFamily;

    // 현재 탭의 기존 설정 가져오기
    const tabSettings = await MemoStorage.loadTabSettings(currentTabId);
    const fontSize = tabSettings.fontSize || "medium";

    // 현재 탭의 설정 업데이트 (폰트 크기 유지, 폰트 패밀리 변경)
    await MemoStorage.saveTabSettings(currentTabId, {
      fontFamily: fontFamily,
      fontSize: fontSize,
    });
  });

  // 폰트 크기 변경 이벤트 - 탭별 설정 저장
  fontSizeButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      // 기존 활성 버튼 비활성화
      fontSizeButtons.forEach((btn) => btn.classList.remove("active"));

      // 새 버튼 활성화
      button.classList.add("active");

      // 폰트 크기 클래스 적용
      const sizes = ["small", "medium", "large"];
      sizes.forEach((size) => memoContent.classList.remove(`font-${size}`));

      // ID에서 크기 추출 (font-size-small -> small)
      const fontSize = button.id.split("-").pop();
      memoContent.classList.add(`font-${fontSize}`);

      // 현재 탭의 폰트 패밀리 가져오기
      const tabSettings = await MemoStorage.loadTabSettings(currentTabId);
      const fontFamily = tabSettings.fontFamily || "Paperlogy-3Light";

      // 탭 설정 업데이트 (폰트 패밀리 유지, 폰트 크기 변경)
      await MemoStorage.saveTabSettings(currentTabId, {
        fontFamily: fontFamily,
        fontSize: fontSize,
      });
    });
  });

  // 다운로드 버튼 이벤트
  downloadBtn.addEventListener("click", () => {
    const content = memoContent.innerHTML;
    TextUtils.downloadMemo(content, currentTabId);
  });

  // 전역 설정 업데이트 및 저장 (테마만)
  async function updateGlobalSettings(newSettings) {
    // 기존 설정에서 tabSettings 유지
    const currentSettings = await MemoStorage.loadSettings();
    settings = {
      ...currentSettings,
      ...newSettings,
    };
    await MemoStorage.saveSettings(settings);
  }

  // 전역 설정 적용 (테마만)
  function applyGlobalSettings(settings) {
    // 테마 적용
    ThemeManager.setTheme(settings.theme || "light");
  }

  // 탭별 설정 적용 (폰트 패밀리, 폰트 크기)
  function applyTabSettings(tabSettings) {
    // 폰트 패밀리 적용
    const fontFamily = tabSettings.fontFamily || "Paperlogy-3Light";
    fontFamilySelector.value = fontFamily;
    memoContent.style.fontFamily = fontFamily;

    // 폰트 크기 적용
    const fontSize = tabSettings.fontSize || "medium";
    const sizeBtn = document.getElementById(`font-size-${fontSize}`);
    if (sizeBtn) {
      fontSizeButtons.forEach((btn) => btn.classList.remove("active"));
      sizeBtn.classList.add("active");

      const sizes = ["small", "medium", "large"];
      sizes.forEach((size) => memoContent.classList.remove(`font-${size}`));
      memoContent.classList.add(`font-${fontSize}`);
    }
  }

  // 팝업 닫힐 때 메모 저장
  window.addEventListener("beforeunload", () => {
    saveCurrentMemo(currentTabId);
  });
});
