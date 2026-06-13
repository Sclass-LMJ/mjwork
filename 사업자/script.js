const API_URL = 'http://localhost:3001/api/search';

// 사업자번호 유효성 검사
function validateBusinessNumber(number) {
    const cleaned = number.replace(/[^0-9]/g, '');
    
    if (cleaned.length !== 10) {
        return false;
    }
    
    // 체크섬 알고리즘
    const checkArray = [1, 3, 7, 1, 3, 7, 1, 3, 5];
    let sum = 0;
    
    for (let i = 0; i < 9; i++) {
        sum += checkArray[i] * parseInt(cleaned.charAt(i));
    }
    
    sum += Math.floor((checkArray[8] * parseInt(cleaned.charAt(8))) / 10);
    const checkDigit = (10 - (sum % 10)) % 10;
    
    return checkDigit === parseInt(cleaned.charAt(9));
}

// 사업자번호 포맷팅
function formatBusinessNumber(number) {
    const cleaned = number.replace(/[^0-9]/g, '');
    if (cleaned.length === 10) {
        return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5, 10)}`;
    }
    return number;
}

// 조회 함수
async function search() {
    const input = document.getElementById('businessNumber');
    const businessNumber = input.value.trim();
    const loadingDiv = document.getElementById('loading');
    const resultDiv = document.getElementById('result');
    
    // 입력 확인
    if (!businessNumber) {
        alert('사업자번호를 입력해주세요.');
        input.focus();
        return;
    }
    
    // 유효성 검사
    if (!validateBusinessNumber(businessNumber)) {
        alert('유효하지 않은 사업자번호입니다.');
        input.focus();
        return;
    }
    
    // 로딩 표시
    loadingDiv.style.display = 'block';
    resultDiv.style.display = 'none';
    
    try {
        // 서버에 요청
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ businessNumber })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showResult(data.data);
        } else {
            showError(data.error || '조회에 실패했습니다.');
        }
        
    } catch (error) {
        showError('서버에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요.');
        console.error(error);
    } finally {
        loadingDiv.style.display = 'none';
    }
}

// 결과 표시
function showResult(data) {
    const resultDiv = document.getElementById('result');
    
    const statusClass = data.status === '계속사업자' ? 'status-active' : 'status-inactive';
    
    resultDiv.innerHTML = `
        <div class="result-item">
            <div class="result-label">사업자등록번호</div>
            <div class="result-value">${formatBusinessNumber(data.businessNumber)}</div>
        </div>
        
        <div class="result-item">
            <div class="result-label">사업자 유형</div>
            <div class="result-value">${data.type || '알 수 없음'}</div>
        </div>
        
        <div class="result-item">
            <div class="result-label">사업자 상태</div>
            <div class="result-value">
                <span class="${statusClass}">${data.status || '알 수 없음'}</span>
            </div>
        </div>
        
        ${data.message ? `<div style="margin-top: 10px; padding: 10px; background: #fff3cd; border-radius: 5px; font-size: 0.9em;">${data.message}</div>` : ''}
    `;
    
    resultDiv.style.display = 'block';
}

// 에러 표시
function showError(message) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = `<div class="error">${message}</div>`;
    resultDiv.style.display = 'block';
}

// Enter 키 처리
document.getElementById('businessNumber').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        search();
    }
});

// 숫자만 입력
document.getElementById('businessNumber').addEventListener('input', function(e) {
    e.target.value = e.target.value.replace(/[^0-9]/g, '').substring(0, 10);
});
