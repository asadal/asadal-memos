/**
 * 탭 관리 및 전환 기능을 처리하는 모듈
 */
const TabManager = (() => {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const memoContent = document.getElementById('memo-content');
  
  let currentTabId = 1;
  
  /**
   * 탭 변경 시 실행되는 콜백 함수 정의
   * @callback TabChangeCallback
   * @param {number} tabId - 변경된 탭 ID
   */
  
  /**
   * 탭 전환 이벤트 초기화
   * @param {TabChangeCallback} onTabChange - 탭 변경 콜백 함수
   */
  function initTabs(onTabChange) {
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tabId = parseInt(button.dataset.tab);
        
        // 이미 활성화된 탭이면 무시
        if (currentTabId === tabId) return;
        
        // 활성 탭 업데이트
        setActiveTab(tabId);
        
        // 콜백 실행
        onTabChange(tabId);
      });
    });
  }
  
  /**
   * 활성 탭 변경
   * @param {number} tabId - 활성화할 탭 ID
   */
  function setActiveTab(tabId) {
    // 이전 탭 비활성화
    tabButtons.forEach(btn => btn.classList.remove('active'));
    
    // 새 탭 활성화
    const activeButton = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    activeButton.classList.add('active');
    
    // 현재 탭 ID 업데이트
    currentTabId = tabId;
    memoContent.dataset.currentTab = tabId;
  }
  
  /**
   * 현재 활성화된 탭 ID 반환
   * @returns {number} - 현재 탭 ID
   */
  function getCurrentTabId() {
    return currentTabId;
  }
  
  return {
    initTabs,
    setActiveTab,
    getCurrentTabId
  };
})();