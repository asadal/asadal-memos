/**
 * 텍스트 처리와 관련된 유틸리티 함수들을 제공하는 모듈
 */
const TextUtils = (() => {
  /**
   * 텍스트에서 URL과 이메일 주소를 인식하여 a 태그로 변환
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

    // 이메일 정규식 패턴
    const emailPattern = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;

    // 텍스트 노드에서 URL과 이메일 찾아 변환
    const textNodes = textNodesUnder(div);
    textNodes.forEach((node) => {
      const nodeText = node.nodeValue;

      // URL이나 이메일이 있는지 확인
      if (urlPattern.test(nodeText) || emailPattern.test(nodeText)) {
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;

        // 텍스트를 순회하면서 URL과 이메일을 찾아 변환
        let matches = [];

        // URL 매칭
        urlPattern.lastIndex = 0;
        let urlMatch;
        while ((urlMatch = urlPattern.exec(nodeText)) !== null) {
          matches.push({
            index: urlMatch.index,
            lastIndex: urlPattern.lastIndex,
            text: urlMatch[0],
            type: "url",
          });
        }

        // 이메일 매칭
        emailPattern.lastIndex = 0;
        let emailMatch;
        while ((emailMatch = emailPattern.exec(nodeText)) !== null) {
          matches.push({
            index: emailMatch.index,
            lastIndex: emailPattern.lastIndex,
            text: emailMatch[0],
            type: "email",
          });
        }

        // 매칭 결과를 인덱스 순으로 정렬
        matches.sort((a, b) => a.index - b.index);

        // 겹치는 매칭 제거 (URL 내에 이메일이 포함된 경우 등)
        for (let i = 0; i < matches.length - 1; i++) {
          if (i < 0) continue;

          const current = matches[i];
          const next = matches[i + 1];

          // 다음 매치가 현재 매치 범위 내에 있는지 확인
          if (next.index < current.lastIndex) {
            // 더 긴 매치를 유지
            if (current.text.length >= next.text.length) {
              matches.splice(i + 1, 1);
              i--;
            } else {
              matches.splice(i, 1);
              i--;
            }
          }
        }

        // 매칭 결과 적용
        for (let i = 0; i < matches.length; i++) {
          const match = matches[i];

          // 매치 앞의 일반 텍스트 추가
          if (match.index > lastIndex) {
            fragment.appendChild(
              document.createTextNode(
                nodeText.substring(lastIndex, match.index),
              ),
            );
          }

          // 링크 생성
          const link = document.createElement("a");
          if (match.type === "url") {
            link.href = match.text;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
          } else if (match.type === "email") {
            link.href = "mailto:" + match.text;
          }
          link.textContent = match.text;
          fragment.appendChild(link);

          lastIndex = match.lastIndex;
        }

        // 남은 텍스트 추가
        if (lastIndex < nodeText.length) {
          fragment.appendChild(
            document.createTextNode(nodeText.substring(lastIndex)),
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

        // mailto: 링크인 경우
        if (url && url.startsWith("mailto:")) {
          // 메일 프로그램 실행
          window.open(url);
          return;
        }

        // 일반 URL인 경우 새 탭에서 열기
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
