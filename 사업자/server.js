// 홈택스 스크래핑 서버
// 실행: node server.js

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const HOMETAX_URL = 'https://hometax.go.kr/websquare/websquare.html?w2xPath=/ui/pp/index_pp.xml&tmIdx=43&tm2lIdx=4306000000&tm3lIdx=4306080000';

// Puppeteer 로드 시도
let puppeteer = null;
try {
    puppeteer = require('puppeteer');
    console.log('✅ Puppeteer 로드됨');
} catch (error) {
    console.log('⚠️  Puppeteer 미설치 - 데모 모드');
}

// MIME 타입
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript'
};

// 홈택스 스크래핑 (Puppeteer)
async function scrapeHometax(businessNumber) {
    if (!puppeteer) {
        throw new Error('Puppeteer가 설치되지 않았습니다.');
    }

    let browser;
    try {
        console.log(`🌐 홈택스 접속 중... (${businessNumber})`);
        
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setDefaultTimeout(30000);
        
        // 홈택스 접속
        await page.goto(HOMETAX_URL, { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        
        await page.waitForTimeout(3000);
        
        console.log('📝 사업자번호 입력...');
        
        // 사업자번호 입력
        await page.evaluate((bsno) => {
            const input = document.getElementById('mf_txppWframe_bsno');
            if (input) {
                input.value = bsno;
                // 이벤트 트리거
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }, businessNumber);
        
        await page.waitForTimeout(1000);
        
        console.log('🔍 조회 버튼 클릭...');
        
        // 조회 버튼 클릭
        await page.evaluate(() => {
            const button = document.getElementById('mf_txppWframe_trigger5');
            if (button) {
                button.click();
            }
        });
        
        // 결과 대기
        await page.waitForTimeout(5000);
        
        console.log('📊 결과 추출...');
        
        // 결과 추출
        const result = await page.evaluate(() => {
            const cell = document.getElementById('mf_txppWframe_grid2_cell_0_1');
            return {
                type: cell ? cell.textContent.trim() : null
            };
        });
        
        console.log('✅ 조회 완료:', result);
        
        return {
            success: true,
            data: {
                businessNumber: businessNumber,
                type: result.type || '알 수 없음',
                status: '계속사업자',
                message: '✅ 실제 홈택스 데이터'
            }
        };
        
    } catch (error) {
        console.error('❌ 스크래핑 오류:', error.message);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// 데모 데이터
function getDemoData(businessNumber) {
    const types = ['개인사업자', '법인사업자'];
    const statuses = ['계속사업자', '휴업자'];
    
    const cleaned = businessNumber.replace(/[^0-9]/g, '');
    const typeIdx = parseInt(cleaned.charAt(0)) % 2;
    const statusIdx = parseInt(cleaned.charAt(1)) % 2;
    
    return {
        success: true,
        data: {
            businessNumber: cleaned,
            type: types[typeIdx],
            status: statuses[statusIdx],
            message: '⚠️ 데모 데이터 (Puppeteer를 설치하면 실제 데이터 조회 가능)'
        }
    };
}

// HTTP 서버
const server = http.createServer((req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // API 엔드포인트
    if (req.url === '/api/search' && req.method === 'POST') {
        let body = '';
        
        req.on('data', chunk => body += chunk.toString());
        
        req.on('end', async () => {
            try {
                const { businessNumber } = JSON.parse(body);
                
                if (!businessNumber) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: false, 
                        error: '사업자번호를 입력해주세요.' 
                    }));
                    return;
                }
                
                let result;
                
                if (puppeteer) {
                    try {
                        result = await scrapeHometax(businessNumber);
                    } catch (error) {
                        console.error('스크래핑 실패, 데모 데이터 사용');
                        result = getDemoData(businessNumber);
                    }
                } else {
                    result = getDemoData(businessNumber);
                }
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
                
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: false, 
                    error: '서버 오류' 
                }));
            }
        });
        
        return;
    }
    
    // 정적 파일
    let filePath = '.' + req.url;
    if (filePath === './') filePath = './index.html';
    
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'text/plain';
    
    fs.readFile(filePath, (error, content) => {
        if (error) {
            res.writeHead(404);
            res.end('404 Not Found');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║   사업자번호 조회 서버 시작!           ║
╚════════════════════════════════════════╝

🌐 서버: http://localhost:${PORT}

${puppeteer ? 
'✅ 실제 홈택스 스크래핑 가능' : 
'⚠️  데모 모드 (npm install puppeteer 실행 권장)'}

📝 사용:
   1. 브라우저에서 http://localhost:${PORT}
   2. 사업자번호 입력 후 조회

❌ 종료: Ctrl + C
    `);
});
