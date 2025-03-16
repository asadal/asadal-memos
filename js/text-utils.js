/**
 * 텍스트 처리와 관련된 유틸리티 함수들을 제공하는 모듈
 */
const TextUtils = (() => {
  /**
   * 텍스트에서 URL을 인식하여 a 태그로 변환
   * @param {string} text - 변환할 텍스트
   * @returns {string} - a 태그가 포함된 HTML
   */
  function linkify(text) {
    if (!text) return "";

    // contenteditable에서는 HTML을 직접 다루므로 안전한 방식으로 처리해야 함
    const div = document.createElement("div");
    div.innerHTML = text;

    // 텍스트 노드만 처리 (이미 링크가 된 부분은 건너뜀)
    const textNodesUnder = (node) => {
      let all = [];
      for (node = node.firstChild; node; node = node.nextSibling) {
        if (node.nodeType === 3) {
          // 텍스트 노드인 경우
          all.push(node);
        } else {
          // 이미 링크(a 태그)인 경우는 처리하지 않음
          if (node.nodeName !== "A") {
            all = all.concat(textNodesUnder(node));
          }
        }
      }
      return all;
    };

    // URL 정규식 패턴
    const urlPattern =
      /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi;

    // 텍스트 노드에서 URL 찾아 변환
    const textNodes = textNodesUnder(div);
    textNodes.forEach((node) => {
      const text = node.nodeValue;
      if (urlPattern.test(text)) {
        // URL을 포함하는 텍스트 노드를 처리
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        let match;

        // 정규식으로 모든 URL 찾기
        urlPattern.lastIndex = 0; // 정규식 인덱스 리셋
        while ((match = urlPattern.exec(text)) !== null) {
          // URL 앞의 텍스트 추가
          if (match.index > lastIndex) {
            fragment.appendChild(
              document.createTextNode(text.substring(lastIndex, match.index)),
            );
          }

          // URL을 링크로 변환
          const link = document.createElement("a");
          link.href = match[0];
          link.textContent = match[0];
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          fragment.appendChild(link);

          lastIndex = urlPattern.lastIndex;
        }

        // 남은 텍스트 추가
        if (lastIndex < text.length) {
          fragment.appendChild(
            document.createTextNode(text.substring(lastIndex)),
          );
        }

        // 원래 노드를 fragment로 교체
        node.parentNode.replaceChild(fragment, node);
      }
    });

    return div.innerHTML;
  }

  /**
   * 선택된 텍스트를 클립보드에 복사
   */
  function copySelectedText() {
    const selection = window.getSelection();
    if (selection.toString().length > 0) {
      navigator.clipboard
        .writeText(selection.toString())
        .then(() => {
          console.log("텍스트가 복사되었습니다.");
        })
        .catch((err) => {
          console.error("텍스트 복사 실패:", err);
        });
    }
  }

  /**
   * 메모 내용을 txt 파일로 다운로드
   * @param {string} content - 다운로드할 텍스트 내용
   * @param {number} tabId - 현재 탭 ID
   */
  function downloadMemo(content, tabId) {
    // HTML 태그 제거
    const plainText = content.replace(/<[^>]*>?/gm, "");

    // Blob 생성
    const blob = new Blob([plainText], { type: "text/plain;charset=utf-8" });

    // 다운로드 링크 생성 및 클릭
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `asadal-memo-${tabId}-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();

    // 링크 URL 해제
    setTimeout(() => {
      URL.revokeObjectURL(link.href);
    }, 100);
  }

  /**
   * 메모 내용에서 링크 클릭 처리
   * @param {Event} e - 클릭 이벤트
   */
  function handleLinkClick(e) {
    // 클릭된 요소 또는 부모가 링크인지 확인
    let target = e.target;
    while (target && target !== e.currentTarget) {
      if (target.tagName === "A") {
        e.preventDefault();
        e.stopPropagation();

        // 링크 URL 가져오기
        const url = target.getAttribute("href");

        // 새 탭에서 링크 열기
        if (url) {
          window.open(url, "_blank");
        }

        return;
      }
      target = target.parentNode;
    }
  }

  return {
    linkify,
    copySelectedText,
    downloadMemo,
    handleLinkClick,
  };
})();
