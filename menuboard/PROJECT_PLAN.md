# 신설오름 - 다국어 식당 메뉴보드

## 프로젝트 개요
Supabase 기반 다국어(한/영/일/중) 식당 메뉴보드 반응형 웹앱.
순수 HTML/CSS/JavaScript로 구현하며 별도 빌드 도구 없이 동작한다.
초기 화면은 한국어 메뉴판이며, 상단 국기 버튼으로 즉시 언어 전환 가능.

## Supabase 설정 정보
- Project ID: `egwynouadwsgxajeamef`
- API URL: `https://egwynouadwsgxajeamef.supabase.co`
- Storage Bucket: `mjTest` (이미지 저장)
- RLS: 활성화 (SELECT/INSERT/UPDATE/DELETE 모두 public 허용 정책 적용)

## 테이블 스키마 (menu_items)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid (PK) | 고유 식별자 (자동 생성) |
| name_ko | text NOT NULL | 메뉴 이름 (한국어) |
| name_en | text | 메뉴 이름 (영어) |
| name_ja | text | 메뉴 이름 (일본어) |
| name_zh | text | 메뉴 이름 (중국어) |
| intro_ko | text NOT NULL | 메뉴 소개 (한국어) |
| intro_en | text | 메뉴 소개 (영어) |
| intro_ja | text | 메뉴 소개 (일본어) |
| intro_zh | text | 메뉴 소개 (중국어) |
| price | integer NOT NULL | 가격 (원) |
| order | int4 | 표시 순서 (오름차순, NULL은 맨 뒤) |
| storage_path | text NOT NULL | 스토리지 이미지 파일명 |
| file_url | text | 이미지 공개 URL |
| created_at | timestamptz | 생성 시각 |

## 파일 구조
```
menuboard/
├── PROJECT_PLAN.md          # 이 파일
├── index.html               # 메인 진입점 (SPA)
├── 신설오름메뉴판로고.png      # 식당 로고 캘리그래피
├── css/
│   └── style.css            # 반응형 스타일
└── js/
    ├── config.js            # Supabase 설정 + 4개 국어 i18n
    ├── supabase.js          # Supabase REST API 래퍼 (CRUD + Storage)
    ├── auth.js              # 관리자 인증 (클라이언트 측)
    ├── menu.js              # 고객 메뉴 페이지 + 상세 모달
    ├── admin.js             # 관리자 CRUD 페이지
    └── app.js               # SPA 라우팅 + 초기화 + 연결 진단
```

## 페이지 흐름
1. **초기 로딩** → 한국어 메뉴판 바로 표시 (헤더 + 로고 + 카드 리스트)
2. **언어 전환** → 헤더의 국기 버튼(🇰🇷 🇺🇸 🇯🇵 🇨🇳) 클릭 시 즉시 전환
3. **메뉴 상세** → 카드 클릭 시 큰 이미지 + 상세 정보 모달 표시
4. **관리자 진입** → 우측 하단 톱니바퀴 FAB → 로그인 모달 → 관리자 페이지
5. **관리자 작업** → 메뉴 추가/수정/삭제 (이미지 업로드 포함, 4개 국어 필수 입력)
6. **로그아웃** → 메뉴판으로 복귀

## 주요 기능
### 고객 메뉴판
- 상단 고정: 헤더(언어 전환 버튼 + 제목) + 신설오름 로고 캘리그래피
- 하단 스크롤: 가로형 카드(왼쪽 이미지 + 오른쪽 이름/소개/가격)
- 외국어 모드: 해당 언어 메뉴명 + 괄호 안 한국어명 (예: Tteokbokki (떡볶이))
- 카드 클릭: 큰 이미지 + 전체 소개 모달
- 정렬: order 값 오름차순 → NULL은 뒤쪽 (생성일 역순)

### 관리자 페이지
- 로그인: ID `1111`, PW `1111` (sessionStorage 기반, 탭 닫으면 로그아웃)
- 메뉴 추가: 이미지 업로드(mjTest 버킷) + 4개 국어 이름/소개 + 가격 + 표시 순서
- 메뉴 수정: 모달 폼으로 모든 필드 수정 (이미지 변경 시 기존 이미지 자동 삭제)
- 메뉴 삭제: 확인 후 DB + Storage 동시 삭제

### Supabase API 연동
- REST API 직접 호출 (fetch, SDK 미사용)
- GET: `order.asc.nullslast,created_at.desc` 정렬
- POST/PATCH/DELETE: `Prefer: return=representation`
- Storage: POST(업로드), DELETE(삭제), Public URL 자동 생성

## 반응형 디자인
| 화면 | 카드 이미지 너비 | 비고 |
|---|---|---|
| PC (>768px) | 240px | 가로 카드, 로고 66% |
| 태블릿 (<=768px) | 180px | 축소 |
| 모바일 (<=480px) | 140px | 소개 텍스트 2줄 제한 |

## 기술적 참고사항
- 프레임워크 없음: 순수 HTML/CSS/JS (빌드 불필요)
- SPA 라우팅: Hash 기반 (`#menu`, `#admin`)
- 폰트: Google Fonts (Noto Sans KR/JP/SC)
- 인증: 클라이언트 측 하드코딩 (Supabase Auth 미연동)
- RLS: 활성화 + 모든 작업 public 허용 정책 적용
- Live Server로 실행 필요 (file:// 프로토콜 CORS 차단)
