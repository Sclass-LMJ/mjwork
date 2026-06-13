// ========================================
// PDF OCR 판독기 - JavaScript 메인 파일
// ========================================
// 이 파일은 PDF 파일을 업로드하고 텍스트를 추출하는 모든 기능을 담당합니다.

// ========== PDF.js 라이브러리 설정 ==========
// PDF.js가 PDF 파일을 처리할 때 필요한 워커(worker) 파일의 위치를 지정
// 워커는 PDF 처리를 백그라운드에서 실행하여 브라우저가 멈추지 않게 해줌
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ========== DOM 요소 선택 ==========
// HTML 문서에서 필요한 요소들을 JavaScript 변수로 가져오기
// getElementById: HTML에서 id 속성으로 요소를 찾음
// querySelector: CSS 선택자로 요소를 찾음

const uploadButton = document.getElementById('uploadButton');         // 파일 업로드 버튼
const fileInput = document.getElementById('fileInput');               // 파일 선택 input (숨김 상태)
const ocrModeSection = document.getElementById('ocrModeSection');     // 모드 선택 화면 전체 영역
const textModeBtn = document.getElementById('textModeBtn');           // "빠른 추출" 모드 버튼
const ocrModeBtn = document.getElementById('ocrModeBtn');             // "OCR 추출" 모드 버튼
const startProcessBtn = document.getElementById('startProcessBtn');   // "처리 시작" 버튼
const loadingContainer = document.getElementById('loadingContainer'); // 로딩 화면 전체 영역
const loadingText = document.getElementById('loadingText');           // 로딩 메시지 텍스트
const progressFill = document.getElementById('progressFill');         // 진행률 바 (색상 부분)
const progressText = document.getElementById('progressText');         // 진행률 퍼센트 숫자
const resultContainer = document.getElementById('resultContainer');   // 결과 표시 영역
const errorContainer = document.getElementById('errorContainer');     // 에러 메시지 영역
const fileTabs = document.getElementById('fileTabs');                 // 파일 탭들이 들어갈 영역
const fileName = document.getElementById('fileName');                 // 현재 파일 이름 표시
const textOutput = document.getElementById('textOutput');             // 추출된 텍스트 표시 영역
const copyButton = document.getElementById('copyButton');                     // 텍스트 복사 버튼
const downloadButton = document.getElementById('downloadButton');             // 개별 다운로드 버튼
const downloadSelectedButton = document.getElementById('downloadSelectedButton'); // 선택 파일 다운로드 버튼
const selectAllBtn = document.getElementById('selectAllBtn');                 // 전체선택 버튼
const selectedCountSpan = document.getElementById('selectedCount');           // 선택된 파일 수 표시
const uploadArea = document.querySelector('.upload-section');                 // 업로드 영역

// ========== 전역 변수 선언 ==========
// 프로그램 전체에서 사용할 변수들을 정의

// processedFiles: 처리된 모든 파일의 정보를 저장하는 객체
// 구조: { fileId: { id, name, text, file } }
// - fileId: 파일을 구별하는 고유 ID
// - name: 원본 파일 이름
// - text: 추출된 텍스트 내용
// - file: 원본 File 객체
let processedFiles = {};

// currentFiles: 사용자가 선택한 파일 목록 (배열)
let currentFiles = [];

// selectedMode: 현재 선택된 처리 모드
// 'text': 빠른 추출 모드 (텍스트 기반 PDF)
// 'ocr': OCR 추출 모드 (이미지 기반 PDF)
let selectedMode = 'text';

// activeFileId: 현재 화면에 표시되고 있는 파일의 ID
let activeFileId = null;

// selectedFiles: 체크박스로 선택된 파일들의 ID를 저장하는 Set
// Set: 중복을 허용하지 않는 집합 자료구조
let selectedFiles = new Set();

// ========================================
// 이벤트 리스너 설정
// ========================================
// 사용자의 클릭, 입력 등의 행동에 반응하는 함수들을 연결

// ---------- 업로드 버튼 클릭 ----------
// 업로드 버튼을 클릭하면 숨겨진 파일 선택창을 열기
uploadButton.addEventListener('click', () => {
    fileInput.click(); // 숨겨진 file input을 클릭한 것처럼 동작
});

// ---------- 파일 선택 ----------
// 파일 선택창에서 파일을 선택했을 때 실행
fileInput.addEventListener('change', (e) => {
    // e.target.files: 선택된 파일들의 목록 (FileList 객체)
    // Array.from(): FileList를 일반 배열로 변환
    const files = Array.from(e.target.files || []);
    
    // 파일이 최소 1개 이상 선택되었는지 확인
    if (files.length > 0) {
        currentFiles = files;          // 선택된 파일들을 변수에 저장
        showModeSelection();            // 모드 선택 화면 표시
    }
});

// ---------- "빠른 추출" 모드 버튼 클릭 ----------
textModeBtn.addEventListener('click', () => {
    selectMode('text'); // 텍스트 모드로 설정
});

// ---------- "OCR 추출" 모드 버튼 클릭 ----------
ocrModeBtn.addEventListener('click', () => {
    selectMode('ocr'); // OCR 모드로 설정
});

// ---------- "처리 시작" 버튼 클릭 ----------
startProcessBtn.addEventListener('click', () => {
    // 선택된 파일이 있는지 확인
    if (currentFiles.length > 0) {
        // PDF 파일들을 선택된 모드로 처리 시작
        processMultiplePDFs(currentFiles, selectedMode);
    }
});

// ---------- 텍스트 복사 버튼 클릭 ----------
copyButton.addEventListener('click', () => {
    // 현재 보고 있는 파일이 있는지 확인
    if (activeFileId && processedFiles[activeFileId]) {
        // navigator.clipboard: 브라우저의 클립보드 API
        // writeText(): 클립보드에 텍스트를 복사
        navigator.clipboard.writeText(processedFiles[activeFileId].text)
            .then(() => {
                // 복사 성공시 알림
                alert('텍스트가 클립보드에 복사되었습니다!');
            })
            .catch(() => {
                // 복사 실패시 알림
                alert('복사에 실패했습니다. 다시 시도해주세요.');
            });
    }
});

// ---------- 개별 다운로드 버튼 클릭 ----------
downloadButton.addEventListener('click', () => {
    // 현재 보고 있는 파일만 다운로드
    if (activeFileId && processedFiles[activeFileId]) {
        downloadTextFile(processedFiles[activeFileId]);
    }
});

// ---------- 선택한 파일 다운로드 버튼 클릭 ----------
if (downloadSelectedButton) {
    downloadSelectedButton.addEventListener('click', () => {
        downloadSelectedFiles(); // 체크박스로 선택한 파일들만 다운로드
    });
}

// ---------- 전체선택 버튼 클릭 ----------
if (selectAllBtn) {
    selectAllBtn.addEventListener('click', () => {
        toggleSelectAll(); // 전체 선택 / 전체 해제 토글
    });
}

// ========================================
// 핵심 함수 정의
// ========================================

/**
 * 모드 선택 화면 표시
 * 
 * 파일을 선택한 후 처리 모드(빠른 추출 / OCR 추출)를 선택하는 화면을 보여줌
 */
function showModeSelection() {
    hideAllContainers();                   // 다른 화면들을 모두 숨김
    ocrModeSection.style.display = 'block'; // 모드 선택 화면만 표시
}

/**
 * 처리 모드 선택
 * 
 * @param {string} mode - 선택할 모드 ('text' 또는 'ocr')
 * 
 * 사용자가 선택한 모드에 따라 버튼의 스타일을 변경하고
 * selectedMode 변수에 선택된 모드를 저장함
 */
function selectMode(mode) {
    selectedMode = mode; // 전역 변수에 선택된 모드 저장
    
    if (mode === 'text') {
        // 빠른 추출 모드 선택시
        textModeBtn.classList.add('active');      // 빠른 추출 버튼을 활성화 스타일로
        ocrModeBtn.classList.remove('active');    // OCR 버튼의 활성화 스타일 제거
    } else {
        // OCR 추출 모드 선택시
        textModeBtn.classList.remove('active');   // 빠른 추출 버튼의 활성화 스타일 제거
        ocrModeBtn.classList.add('active');       // OCR 버튼을 활성화 스타일로
    }
}

/**
 * 진행률 업데이트
 * 
 * @param {number} percent - 진행률 (0부터 100까지)
 * @param {string} text - 진행 상태 메시지 (예: "페이지 3/10 처리 중...")
 * 
 * 로딩 화면의 진행률 바와 퍼센트 숫자, 상태 메시지를 업데이트함
 */
function updateProgress(percent, text) {
    // 진행률 바의 너비를 퍼센트만큼 설정 (0% = 0px, 100% = 전체 너비)
    progressFill.style.width = `${percent}%`;
    
    // 소수점을 반올림하여 정수로 표시 (예: 45.7% → 46%)
    progressText.textContent = `${Math.round(percent)}%`;
    
    // 상태 메시지가 제공되면 텍스트 업데이트
    if (text) {
        loadingText.textContent = text;
    }
}

/**
 * 여러 PDF 파일 처리 (메인 처리 함수)
 * 
 * @param {File[]} files - 처리할 PDF 파일 배열
 * @param {string} mode - 처리 모드 ('text': 빠른 추출, 'ocr': OCR 인식)
 * 
 * async/await: 비동기 처리를 동기적으로 작성할 수 있게 해주는 문법
 * 파일 처리는 시간이 걸리므로 비동기로 처리하여 브라우저가 멈추지 않게 함
 */
async function processMultiplePDFs(files, mode) {
    // ----- 초기화 -----
    hideAllContainers();           // 모든 화면 숨기기
    showLoadingContainer();        // 로딩 화면 표시
    processedFiles = {};           // 이전에 처리된 파일 정보 초기화
    selectedFiles.clear();         // 이전에 선택된 파일 목록 초기화 (새로운 업로드이므로)
    
    const totalFiles = files.length; // 처리할 파일 총 개수
    
    // ----- 각 파일을 순서대로 처리 -----
    // for...of: 배열의 각 요소를 순회
    for (let i = 0; i < totalFiles; i++) {
        const file = files[i]; // 현재 처리할 파일
        
        // 파일마다 고유한 ID 생성 (현재 시간 + 인덱스)
        const fileId = `file_${Date.now()}_${i}`;
        
        // 현재 처리 중인 파일 정보 표시
        updateProgress(0, `파일 ${i + 1}/${totalFiles} 처리 중: ${file.name}`);
        
        try {
            // ----- 파일 검증 -----
            
            // 1. PDF 파일인지 확인
            if (file.type !== 'application/pdf') {
                console.warn(`${file.name}은(는) PDF 파일이 아닙니다. 건너뜁니다.`);
                continue; // 이 파일은 건너뛰고 다음 파일로
            }

            // 2. 파일 크기 확인 (100MB 초과시 건너뜀)
            // 1024 * 1024 = 1MB, 100MB = 100 * 1024 * 1024 bytes
            if (file.size > 100 * 1024 * 1024) {
                console.warn(`${file.name}의 크기가 너무 큽니다. 건너뜁니다.`);
                continue;
            }

            // ----- PDF 파일 읽기 -----
            
            // PDF 파일을 ArrayBuffer로 변환 (PDF.js가 읽을 수 있는 형식)
            // await: 비동기 작업이 완료될 때까지 대기
            const arrayBuffer = await file.arrayBuffer();
            
            // PDF.js를 사용하여 PDF 문서 객체 생성
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            // 텍스트를 저장할 변수
            let fullText = '';

            // ----- 선택된 모드에 따라 텍스트 추출 -----
            if (mode === 'text') {
                // 빠른 추출 모드: PDF의 텍스트 레이어에서 직접 추출
                fullText = await extractTextMode(pdf, i + 1, totalFiles, file.name);
            } else {
                // OCR 모드: PDF를 이미지로 변환한 후 Tesseract로 텍스트 인식
                fullText = await extractOCRMode(pdf, i + 1, totalFiles, file.name);
            }

            // ----- 처리 결과 저장 -----
            processedFiles[fileId] = {
                id: fileId,                    // 파일 ID
                name: file.name,               // 파일 이름
                text: fullText.trim(),         // 추출된 텍스트 (앞뒤 공백 제거)
                file: file                     // 원본 File 객체
            };

        } catch (error) {
            // 파일 처리 중 오류 발생시
            console.error(`${file.name} 처리 중 오류:`, error);
            
            // 오류 정보도 저장하여 사용자에게 알림
            processedFiles[fileId] = {
                id: fileId,
                name: file.name,
                text: `오류: 파일을 처리할 수 없습니다.`,
                file: file
            };
        }
    }

    // ----- 결과 표시 -----
    // Object.keys(): 객체의 모든 키(key)를 배열로 반환
    if (Object.keys(processedFiles).length > 0) {
        // 처리된 파일이 1개 이상 있으면 결과 화면 표시
        showResults();
    } else {
        // 처리된 파일이 없으면 에러 메시지 표시
        showError('처리된 파일이 없습니다. PDF 파일을 다시 확인해주세요.');
    }
}

/**
 * 텍스트 모드: PDF.js로 텍스트 추출
 * 
 * @param {PDFDocumentProxy} pdf - PDF 문서 객체 (PDF.js가 생성)
 * @param {number} fileIndex - 현재 파일 인덱스 (1부터 시작)
 * @param {number} totalFiles - 전체 파일 수
 * @param {string} fileName - 파일 이름
 * @returns {Promise<string>} 추출된 텍스트
 * 
 * PDF의 텍스트 레이어에서 직접 텍스트를 추출함 (빠름)
 * 텍스트 기반 PDF에만 적합
 */
async function extractTextMode(pdf, fileIndex, totalFiles, fileName) {
    let fullText = '';                    // 전체 텍스트를 저장할 변수
    const totalPages = pdf.numPages;      // PDF의 총 페이지 수

    // 각 페이지를 순서대로 처리
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        try {
            // ----- 진행률 계산 및 업데이트 -----
            // 전체 진행률 = (이전 파일들 + 현재 페이지) / 전체 작업량
            const overallProgress = ((fileIndex - 1) / totalFiles + (pageNum / totalPages) / totalFiles) * 100;
            updateProgress(overallProgress, `파일 ${fileIndex}/${totalFiles} (${fileName}) - 페이지 ${pageNum}/${totalPages}`);
            
            // ----- 페이지 텍스트 추출 -----
            
            // 1. 페이지 객체 가져오기
            const page = await pdf.getPage(pageNum);
            
            // 2. 페이지의 텍스트 콘텐츠 추출
            const textContent = await page.getTextContent();
            
            // 3. 텍스트 아이템들을 공백으로 연결하여 문자열로 변환
            // textContent.items: 페이지의 모든 텍스트 조각들
            // map(): 배열의 각 요소를 변환
            // join(' '): 배열을 공백으로 연결하여 하나의 문자열로
            const pageText = textContent.items
                .map((item) => item.str)  // 각 아이템에서 문자열만 추출
                .join(' ');               // 공백으로 연결
            
            // 4. 페이지 구분자와 함께 전체 텍스트에 추가
            fullText += `\n--- 페이지 ${pageNum} ---\n${pageText}\n`;
            
        } catch (pageError) {
            // 특정 페이지 처리 중 오류 발생시
            console.error(`페이지 ${pageNum} 처리 중 오류:`, pageError);
            fullText += `\n--- 페이지 ${pageNum} (오류) ---\n텍스트를 추출할 수 없습니다.\n`;
        }
    }

    return fullText; // 추출된 전체 텍스트 반환
}

/**
 * OCR 모드: Tesseract.js로 이미지 인식
 * 
 * @param {PDFDocumentProxy} pdf - PDF 문서 객체
 * @param {number} fileIndex - 현재 파일 인덱스
 * @param {number} totalFiles - 전체 파일 수
 * @param {string} fileName - 파일 이름
 * @returns {Promise<string>} 추출된 텍스트
 * 
 * PDF 페이지를 이미지로 렌더링한 후 Tesseract로 텍스트 인식 (느림)
 * 이미지/스캔 PDF에 적합
 */
async function extractOCRMode(pdf, fileIndex, totalFiles, fileName) {
    let fullText = '';
    const totalPages = pdf.numPages;

    // 각 페이지를 순서대로 처리
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        try {
            // ----- 진행률 업데이트 -----
            const overallProgress = ((fileIndex - 1) / totalFiles + (pageNum / totalPages) / totalFiles) * 100;
            updateProgress(overallProgress, `OCR ${fileIndex}/${totalFiles} (${fileName}) - 페이지 ${pageNum}/${totalPages}`);
            
            // ----- PDF 페이지를 이미지로 렌더링 -----
            
            // 1. 페이지 객체 가져오기
            const page = await pdf.getPage(pageNum);
            
            // 2. viewport 설정 (페이지 크기와 해상도)
            // scale: 2.0 = 2배 해상도 (OCR 정확도 향상)
            const viewport = page.getViewport({ scale: 2.0 });
            
            // 3. HTML Canvas 요소 생성 (이미지를 그릴 캔버스)
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;   // 캔버스 너비 설정
            canvas.height = viewport.height; // 캔버스 높이 설정
            
            // 4. PDF 페이지를 캔버스에 그리기
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
            
            // 5. 캔버스를 이미지 데이터(PNG)로 변환
            // toDataURL: 캔버스 내용을 Base64로 인코딩된 이미지 URL로 변환
            const imageData = canvas.toDataURL('image/png');
            
            // ----- Tesseract.js로 OCR 수행 -----
            
            // Tesseract.recognize(): 이미지에서 텍스트를 인식
            // 'kor+eng': 한글과 영어를 모두 인식
            const { data: { text } } = await Tesseract.recognize(
                imageData,     // 인식할 이미지
                'kor+eng',     // 인식할 언어
                {
                    // logger: OCR 진행 상황을 모니터링하는 콜백 함수
                    logger: (m) => {
                        // OCR 인식 단계에서만 진행률 업데이트
                        if (m.status === 'recognizing text') {
                            // OCR 내부 진행률을 반영한 전체 진행률 계산
                            const pageProgress = ((fileIndex - 1) / totalFiles + (pageNum - 1 + m.progress) / totalPages / totalFiles) * 100;
                            updateProgress(pageProgress, `OCR ${fileIndex}/${totalFiles} (${fileName}) - 페이지 ${pageNum}/${totalPages}`);
                        }
                    }
                }
            );
            
            // 인식된 텍스트를 전체 텍스트에 추가
            fullText += `\n--- 페이지 ${pageNum} ---\n${text.trim()}\n`;
            
        } catch (pageError) {
            // OCR 처리 중 오류 발생시
            console.error(`페이지 ${pageNum} OCR 처리 중 오류:`, pageError);
            fullText += `\n--- 페이지 ${pageNum} (오류) ---\nOCR 처리에 실패했습니다.\n`;
        }
    }

    return fullText; // 인식된 전체 텍스트 반환
}

/**
 * 결과 표시 (탭 생성)
 * 
 * 처리가 완료된 모든 파일을 탭 형태로 표시하고
 * 첫 번째 파일의 내용을 화면에 보여줌
 */
function showResults() {
    hideAllContainers();                      // 다른 화면들 숨기기
    resultContainer.style.display = 'block';  // 결과 화면 표시
    uploadArea.style.display = 'block';       // 업로드 영역도 표시 (추가 업로드 가능)
    
    // ----- 탭 생성 -----
    
    fileTabs.innerHTML = '';                        // 기존 탭들 모두 제거
    const fileIds = Object.keys(processedFiles);    // 처리된 파일들의 ID 목록
    
    // 각 파일마다 탭 버튼 생성
    fileIds.forEach((fileId, index) => {
        const fileData = processedFiles[fileId];  // 파일 데이터 가져오기
        
        // 탭 버튼 요소 생성
        const tab = document.createElement('button');
        tab.className = 'file-tab';              // CSS 클래스 설정
        tab.dataset.fileId = fileId;             // 데이터 속성에 파일 ID 저장
        
        // 파일 이름이 너무 길면 축약 (20자 초과시 "..." 표시)
        const shortName = fileData.name.length > 20 
            ? fileData.name.substring(0, 17) + '...'  // 앞 17자만 + "..."
            : fileData.name;                          // 20자 이하면 전체 표시
        
        // 탭 버튼의 HTML 내용 설정 (체크박스 포함)
        tab.innerHTML = `
            <input type="checkbox" class="tab-checkbox" data-file-id="${fileId}" ${selectedFiles.has(fileId) ? 'checked' : ''}>
            <span class="tab-name">${shortName}</span>
            <span class="tab-close" data-file-id="${fileId}">×</span>
        `;
        
        // ----- 체크박스 클릭 이벤트 -----
        // 체크박스를 클릭하면 선택 상태 토글
        const checkbox = tab.querySelector('.tab-checkbox');
        checkbox.addEventListener('click', (e) => {
            e.stopPropagation();  // 탭 클릭 이벤트 방지
            toggleFileSelection(fileId, checkbox.checked);
        });
        
        // ----- 탭 클릭 이벤트 -----
        // 탭을 클릭하면 해당 파일의 내용을 표시
        tab.addEventListener('click', (e) => {
            // 닫기 버튼(×)이나 체크박스를 클릭한 경우는 탭 전환 안 함
            if (!e.target.classList.contains('tab-close') && !e.target.classList.contains('tab-checkbox')) {
                switchTab(fileId);  // 해당 탭으로 전환
            }
        });
        
        // ----- 탭 닫기 버튼 이벤트 -----
        // × 버튼을 클릭하면 해당 파일 제거
        tab.querySelector('.tab-close').addEventListener('click', (e) => {
            e.stopPropagation();  // 이벤트 버블링 방지 (탭 클릭 이벤트가 실행되지 않게)
            closeTab(fileId);     // 탭 닫기
        });
        
        // 생성한 탭을 탭 영역에 추가
        fileTabs.appendChild(tab);
    });
    
    // ----- 첫 번째 탭 활성화 -----
    // 파일이 1개 이상 있으면 첫 번째 파일을 표시
    if (fileIds.length > 0) {
        switchTab(fileIds[0]);
    }
    
    // 선택된 파일 수 업데이트 (전체선택 버튼 클릭 시 반영)
    updateSelectedCount();
}

/**
 * 탭 전환
 * 
 * @param {string} fileId - 전환할 파일의 ID
 * 
 * 클릭한 탭에 해당하는 파일의 내용을 화면에 표시
 */
function switchTab(fileId) {
    activeFileId = fileId;                     // 현재 활성 파일 ID 저장
    const fileData = processedFiles[fileId];   // 파일 데이터 가져오기
    
    // 파일 데이터가 없으면 종료
    if (!fileData) return;
    
    // ----- 탭 스타일 업데이트 -----
    // 모든 탭을 순회하면서 활성화 상태 업데이트
    document.querySelectorAll('.file-tab').forEach(tab => {
        tab.classList.remove('active');         // 모든 탭의 활성화 클래스 제거
        
        // 클릭한 탭에만 활성화 클래스 추가
        if (tab.dataset.fileId === fileId) {
            tab.classList.add('active');
        }
    });
    
    // ----- 내용 표시 -----
    fileName.textContent = fileData.name;      // 파일 이름 표시
    
    // 추출된 텍스트 표시 (없으면 안내 메시지)
    textOutput.textContent = fileData.text || '텍스트를 추출할 수 없습니다.';
}

/**
 * 탭 닫기
 * 
 * @param {string} fileId - 닫을 파일의 ID
 * 
 * 선택한 탭(파일)을 목록에서 제거
 */
function closeTab(fileId) {
    // 파일 목록에서 제거
    delete processedFiles[fileId];
    
    // 선택 목록에서도 제거
    selectedFiles.delete(fileId);
    
    // 남은 파일들의 ID 목록
    const remainingIds = Object.keys(processedFiles);
    
    if (remainingIds.length === 0) {
        // 모든 파일이 닫혔으면
        hideAllContainers();              // 결과 화면 숨기기
        uploadArea.style.display = 'block'; // 업로드 영역만 표시
        selectedFiles.clear();             // 선택 목록 초기화
    } else {
        // 다른 파일이 남아있으면
        // 현재 보고 있던 파일이 닫힌 경우, 다른 파일로 전환
        if (activeFileId === fileId) {
            switchTab(remainingIds[0]);  // 첫 번째 남은 파일로 전환
        }
        showResults();  // 탭 목록 다시 생성
    }
}

/**
 * 파일 선택 상태 토글
 * 
 * @param {string} fileId - 파일 ID
 * @param {boolean} isChecked - 체크박스 체크 여부
 * 
 * 체크박스 클릭시 선택/해제 상태를 관리
 */
function toggleFileSelection(fileId, isChecked) {
    if (isChecked) {
        // 체크되면 선택 목록에 추가
        selectedFiles.add(fileId);
    } else {
        // 체크 해제되면 선택 목록에서 제거
        selectedFiles.delete(fileId);
    }
    
    // 선택된 파일 수 업데이트
    updateSelectedCount();
}

/**
 * 전체 선택 / 전체 해제 토글
 * 
 * 전체선택 버튼을 클릭하면 모든 파일을 선택하거나 모두 해제
 */
function toggleSelectAll() {
    const fileIds = Object.keys(processedFiles);  // 모든 파일 ID
    
    // 현재 모든 파일이 선택되어 있는지 확인
    const allSelected = fileIds.every(id => selectedFiles.has(id));
    
    if (allSelected) {
        // 모두 선택되어 있으면 → 전체 해제
        selectedFiles.clear();
    } else {
        // 일부만 선택되어 있거나 아무것도 선택 안 됐으면 → 전체 선택
        fileIds.forEach(id => selectedFiles.add(id));
    }
    
    // UI 업데이트
    showResults();
}

/**
 * 선택된 파일 수 업데이트
 * 
 * 화면에 표시되는 선택된 파일 수를 갱신
 */
function updateSelectedCount() {
    if (selectedCountSpan) {
        selectedCountSpan.textContent = selectedFiles.size;
    }
}

/**
 * 개별 파일 다운로드
 * 
 * @param {Object} fileData - 다운로드할 파일 데이터
 * 
 * 하나의 파일을 텍스트 파일(.txt)로 다운로드
 */
function downloadTextFile(fileData) {
    // ----- 파일 이름 생성 -----
    // 원본 파일명에서 .pdf 확장자 제거
    const originalName = fileData.name.replace('.pdf', '');
    
    // 새 파일명: "원본이름_text전환.txt"
    const textFileName = `${originalName}_text전환.txt`;
    
    // ----- 텍스트 파일 생성 -----
    
    // 1. Blob 객체 생성 (Binary Large Object)
    // Blob: 파일과 같은 바이너리 데이터를 다루는 객체
    const blob = new Blob([fileData.text], { 
        type: 'text/plain;charset=utf-8'  // UTF-8 인코딩의 텍스트 파일
    });
    
    // 2. Blob을 다운로드 가능한 URL로 변환
    const url = URL.createObjectURL(blob);
    
    // 3. 가상의 <a> 태그 생성 (다운로드 트리거용)
    const a = document.createElement('a');
    a.href = url;                    // 다운로드할 파일 URL
    a.download = textFileName;       // 다운로드될 파일명
    
    // 4. 가상의 <a> 태그를 문서에 추가하고 클릭 (다운로드 시작)
    document.body.appendChild(a);
    a.click();
    
    // 5. 사용이 끝난 요소와 URL 정리 (메모리 해제)
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * 선택한 파일만 다운로드
 * 
 * 체크박스로 선택된 파일들만 순차적으로 다운로드
 */
function downloadSelectedFiles() {
    // 선택된 파일이 없으면
    if (selectedFiles.size === 0) {
        alert('다운로드할 파일을 선택해주세요.\n(탭의 체크박스를 체크하거나 전체선택 버튼을 누르세요)');
        return;
    }
    
    // Set을 배열로 변환
    const selectedIds = Array.from(selectedFiles);
    
    // ----- 각 파일을 순차적으로 다운로드 -----
    selectedIds.forEach((fileId, index) => {
        // 해당 파일이 아직 존재하는지 확인
        if (processedFiles[fileId]) {
            setTimeout(() => {
                downloadTextFile(processedFiles[fileId]);
            }, index * 500);  // 0.5초 간격으로 다운로드
        }
    });
    
    // 사용자에게 안내 메시지
    alert(`선택한 ${selectedIds.length}개의 파일이 다운로드됩니다.`);
}

/**
 * 에러 메시지 표시
 * 
 * @param {string} message - 표시할 에러 메시지
 * 
 * 오류 발생시 사용자에게 에러 메시지를 보여줌
 */
function showError(message) {
    hideAllContainers();                        // 다른 화면들 숨기기
    errorContainer.textContent = message;       // 에러 메시지 설정
    errorContainer.style.display = 'block';     // 에러 영역 표시
    uploadArea.style.display = 'block';         // 업로드 영역도 표시 (재시도 가능)
}

/**
 * 로딩 컨테이너 표시
 * 
 * PDF 파일 처리 중일 때 로딩 화면을 보여줌
 */
function showLoadingContainer() {
    loadingContainer.style.display = 'flex';  // flex: 중앙 정렬을 위한 display 속성
}

/**
 * 모든 컨테이너 숨기기
 * 
 * 화면 전환시 모든 화면을 먼저 숨긴 후 필요한 화면만 표시
 */
function hideAllContainers() {
    ocrModeSection.style.display = 'none';    // 모드 선택 화면 숨김
    loadingContainer.style.display = 'none';  // 로딩 화면 숨김
    resultContainer.style.display = 'none';   // 결과 화면 숨김
    errorContainer.style.display = 'none';    // 에러 화면 숨김
}

// ========================================
// 프로그램 종료
// ========================================
// 모든 함수와 이벤트 리스너가 설정되었으므로
// 사용자의 입력을 기다립니다.
