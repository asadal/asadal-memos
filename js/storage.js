const MemoStorage = (() => {
  // 기본 설정값
  // 기본 설정값 수정
  const DEFAULT_SETTINGS = {
    theme: "light",
    tabSettings: {
      1: { fontFamily: "Paperlogy-3Light", fontSize: "medium" },
      2: { fontFamily: "Paperlogy-3Light", fontSize: "medium" },
      3: { fontFamily: "Paperlogy-3Light", fontSize: "medium" },
    },
  };

  /**
   * 메모 데이터를 Chrome 스토리지에 저장
   * @param {number} tabId - 저장할 탭 ID
   * @param {string} content - 저장할 메모 내용
   * @returns {Promise} - 저장 완료 Promise
   */
  function saveMemo(tabId, content) {
    return new Promise((resolve, reject) => {
      // 탭 ID 확인
      if (!tabId || isNaN(tabId)) {
        console.error("유효하지 않은 탭 ID:", tabId);
        reject(new Error("유효하지 않은 탭 ID"));
        return;
      }

      const key = `memo_${tabId}`;
      const data = {};
      data[key] = content;

      console.log(`저장 중: ${key}`, content.substring(0, 30));

      chrome.storage.sync.set(data, () => {
        if (chrome.runtime.lastError) {
          console.error("저장 오류:", chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * 메모 데이터를 Chrome 스토리지에서 불러오기
   * @param {number} tabId - 불러올 탭 ID
   * @returns {Promise<string>} - 저장된 메모 내용
   */
  function loadMemo(tabId) {
    return new Promise((resolve, reject) => {
      // 탭 ID 확인
      if (!tabId || isNaN(tabId)) {
        console.error("유효하지 않은 탭 ID:", tabId);
        reject(new Error("유효하지 않은 탭 ID"));
        return;
      }

      const key = `memo_${tabId}`;
      console.log(`로드 중: ${key}`);

      chrome.storage.sync.get(key, (result) => {
        if (chrome.runtime.lastError) {
          console.error("로드 오류:", chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          const content = result[key] || "";
          console.log(`로드 완료: ${key}`, content.substring(0, 30));
          resolve(content);
        }
      });
    });
  }

  /**
   * 탭별 설정 저장
   * @param {number} tabId - 탭 ID
   * @param {Object} tabSettings - 탭 설정 객체
   * @returns {Promise} - 저장 완료 Promise
   */
  function saveTabSettings(tabId, tabSettings) {
    return new Promise((resolve, reject) => {
      loadSettings()
        .then((settings) => {
          if (!settings.tabSettings) {
            settings.tabSettings = {};
          }
          settings.tabSettings[tabId] = tabSettings;
          return saveSettings(settings);
        })
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * 탭별 설정 로드
   * @param {number} tabId - 탭 ID
   * @returns {Promise<Object>} - 탭 설정 객체
   */
  function loadTabSettings(tabId) {
    return new Promise((resolve, reject) => {
      loadSettings()
        .then((settings) => {
          const defaultTabSettings = { fontFamily: "Paperlogy-3Light" };
          const tabSettings =
            settings.tabSettings && settings.tabSettings[tabId]
              ? settings.tabSettings[tabId]
              : defaultTabSettings;
          resolve(tabSettings);
        })
        .catch(reject);
    });
  }

  /**
   * 저장된 모든 메모 데이터 확인 (디버깅용)
   */
  function getAllMemos() {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get(null, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          const memos = {};
          for (const key in result) {
            if (key.startsWith("memo_")) {
              memos[key] = result[key];
            }
          }
          resolve(memos);
        }
      });
    });
  }

  /**
   * 앱 설정을 Chrome 스토리지에 저장
   * @param {Object} settings - 저장할 설정 객체
   * @returns {Promise} - 저장 완료 Promise
   */
  function saveSettings(settings) {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.set({ settings }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * 앱 설정을 Chrome 스토리지에서 불러오기
   * @returns {Promise<Object>} - 저장된 설정 객체
   */
  function loadSettings() {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get("settings", (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result.settings || DEFAULT_SETTINGS);
        }
      });
    });
  }

  return {
    saveMemo,
    loadMemo,
    saveTabSettings,
    loadTabSettings,
    getAllMemos,
    saveSettings,
    loadSettings,
    DEFAULT_SETTINGS,
  };
})();
