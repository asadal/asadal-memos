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
  let lastCaretPosition = null; // 마지막 커서 위치 저장
  let preventLinkify = false; // 링크 변환 임시 방지 플래그

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

  // 커서 위치 저장 함수
  function saveCaretPosition() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);

      // 커서 위치 저장
      lastCaretPosition = {
        range: range.cloneRange(),
        // 추가 위치 정보
        text: range.startContainer.textContent,
        startOffset: range.startOffset,
        endOffset: range.endOffset,
        // 스크롤 정보
        scrollTop: memoContent.scrollTop,
      };
    }
  }

  // 커서 위치 복원 함수
  function restoreCaretPosition() {
    if (!lastCaretPosition) return;

    try {
      // 스크롤 위치 복원
      memoContent.scrollTop = lastCaretPosition.scrollTop;

      // DOM이 변경되었을 가능성이 있으므로 텍스트 검색 기반 접근
      const allTextNodes = [];
      const walker = document.createTreeWalker(
        memoContent,
        NodeFilter.SHOW_TEXT,
        null,
        false,
      );

      // 모든 텍스트 노드 수집
      let node;
      while ((node = walker.nextNode())) {
        allTextNodes.push(node);
      }

      // 일치하는 텍스트 노드 찾기
      const matchedNode = allTextNodes.find(
        (node) => node.textContent === lastCaretPosition.text,
      );

      if (matchedNode) {
        // 일치하는 노드에 커서 위치 설정
        const range = document.createRange();
        range.setStart(matchedNode, lastCaretPosition.startOffset);
        range.setEnd(matchedNode, lastCaretPosition.endOffset);

        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        // 정확한 노드를 찾지 못한 경우, 컨텐츠 끝으로 이동
        const range = document.createRange();
        if (memoContent.lastChild) {
          range.selectNodeContents(memoContent);
          range.collapse(false); // 컨텐츠 끝으로
        } else {
          range.setStart(memoContent, 0);
          range.setEnd(memoContent, 0);
        }

        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } catch (e) {
      console.error("커서 위치 복원 실패:", e);
    }
  }

  // 메모 내용 입력 이벤트
  memoContent.addEventListener("input", () => {
    // 현재 커서 위치 저장
    saveCaretPosition();

    // 타이핑 타이머 초기화
    clearTimeout(typingTimer);
    isTyping = true;

    // 링크 변환이 방지된 상태라면 타이머 재설정 없이 종료
    if (preventLinkify) return;

    // 타이핑이 0.5초 동안 없을 때 하이퍼링크 변환 및 저장
    typingTimer = setTimeout(async () => {
      isTyping = false;

      // 링크 변환 전 커서 위치 및 스크롤 위치 저장
      const scrollTop = memoContent.scrollTop;

      // 링크 변환 전 내용
      const originalHtml = memoContent.innerHTML;

      // 링크가 없으면 처리 건너뛰기
      if (!originalHtml.includes("http") && !originalHtml.includes("@")) {
        await saveCurrentMemo(currentTabId);
        return;
      }

      // 링크 변환 적용
      memoContent.innerHTML = TextUtils.linkify(originalHtml);

      // 스크롤 위치 복원
      memoContent.scrollTop = scrollTop;

      // 저장한 커서 위치 복원
      restoreCaretPosition();

      // 저장
      await saveCurrentMemo(currentTabId);
    }, 1000); // 타임아웃을 1초로 늘림
  });

  // 키보드 이벤트: 방향키나 Home/End 키를 누를 때 커서 위치 저장
  memoContent.addEventListener("keydown", (e) => {
    // 방향키, Home, End, PageUp, PageDown 키 누를 때
    if ([33, 34, 35, 36, 37, 38, 39, 40].includes(e.keyCode)) {
      // 약간의 지연 후 커서 위치 저장 (키보드 입력 처리 후)
      setTimeout(() => {
        saveCaretPosition();
      }, 0);
    }
  });

  // 마우스로 클릭할 때 커서 위치 저장
  memoContent.addEventListener("mouseup", () => {
    // 선택 텍스트가 없는 경우만 커서 위치 저장
    if (window.getSelection().toString() === "") {
      saveCaretPosition();
    }
  });

  // 붙여넣기 이벤트 특별 처리
  memoContent.addEventListener("paste", (e) => {
    // 방금 붙여넣기 했으므로 자동 링크 변환을 잠시 방지
    preventLinkify = true;

    // 일정 시간 후 방지 해제 (사용자가 추가 작업할 시간 제공)
    setTimeout(() => {
      preventLinkify = false;

      // 링크 변환 타이머 설정
      clearTimeout(typingTimer);
      typingTimer = setTimeout(async () => {
        const scrollTop = memoContent.scrollTop;
        saveCaretPosition(); // 현재 커서 위치 저장

        const originalHtml = memoContent.innerHTML;

        // 링크가 없으면 처리 건너뛰기
        if (!originalHtml.includes("http") && !originalHtml.includes("@")) {
          await saveCurrentMemo(currentTabId);
          return;
        }

        memoContent.innerHTML = TextUtils.linkify(originalHtml);
        memoContent.scrollTop = scrollTop;

        // 커서 위치 복원
        restoreCaretPosition();

        // 저장
        await saveCurrentMemo(currentTabId);
      }, 1000);
    }, 2000); // 2초 후 링크 변환 허용
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

      // 탭 전환 후 커서를 메모 끝으로 이동
      const range = document.createRange();
      if (memoContent.lastChild) {
        range.setStartAfter(memoContent.lastChild);
        range.setEndAfter(memoContent.lastChild);
      } else {
        range.setStart(memoContent, 0);
        range.setEnd(memoContent, 0);
      }

      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);

      // 탭 전환 시 커서 위치 초기화
      lastCaretPosition = null;
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
  memoContent.addEventListener("mouseup", (e) => {
    const selection = window.getSelection();
    if (selection.toString().length > 0) {
      TextUtils.copySelectedText();
    } else {
      // 선택된 텍스트가 없으면 커서 위치 저장
      saveCaretPosition();
    }
  });

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
