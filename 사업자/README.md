# 사업자번호 조회 시스템

실시간 홈택스 데이터 조회

## 🚀 빠른 시작

### 1. Puppeteer 설치 (실제 데이터)
```bash
npm install puppeteer
```

### 2. 서버 시작
```bash
npm start
```

### 3. 브라우저 접속
```
http://localhost:3000
```

---

## 📝 Puppeteer 없이 실행 (데모 모드)

Puppeteer 설치 없이도 작동하지만 데모 데이터만 나옵니다:

```bash
node server.js
```

---

## ⚠️ 주의사항

- 교육 목적으로만 사용하세요
- 실제 서비스는 공공데이터 API 권장
- Puppeteer 설치 시 5-10분 소요 (Chrome 포함)

---

## 📊 스크래핑 원리

1. 홈택스 페이지 자동 접속
2. #mf_txppWframe_bsno에 사업자번호 입력
3. #mf_txppWframe_trigger5 버튼 클릭
4. #mf_txppWframe_grid2_cell_0_1 결과 추출

---

## 🔧 문제 해결

**Q: npm install 실패**
- Google Drive에서 로컬 폴더로 복사 후 재시도

**Q: 스크래핑 실패**
- 홈택스 구조 변경 가능성
- 데모 모드로 자동 전환됨

**Q: 법적 문제?**
- 교육용은 OK
- 상업용은 공공데이터 API 사용 (https://www.data.go.kr/)

---

## 📞 공공데이터 API (권장)

실제 서비스에는 이것을 사용하세요:
- https://www.data.go.kr/
- "국세청 사업자" 검색
- 무료, 합법적, 안정적
