const MenuPage = (() => {
  let currentLang = 'ko';
  let menuItems = [];

  function getLang() {
    return currentLang;
  }

  function setLang(lang) {
    currentLang = lang;
  }

  function formatPrice(price) {
    if (!price && price !== 0) return '';
    return Number(price).toLocaleString();
  }

  async function renderMenuPage() {
    const page = document.getElementById('page-menu');
    const t = I18N[currentLang];

    const langs = ['ko', 'en', 'ja', 'zh'];

    page.innerHTML = `
      <div class="menu-fixed-top">
        <header class="menu-header">
          <div class="header-lang-switcher">
            ${langs.map(lang => `
              <button class="lang-switch-btn ${lang === currentLang ? 'active' : ''}" data-lang="${lang}" title="${I18N[lang].langName}">
                <span class="lang-switch-flag">${I18N[lang].flag}</span>
              </button>
            `).join('')}
          </div>
          <h1 class="menu-title">${t.title}</h1>
          <button class="admin-header-btn" id="btn-admin" title="${t.admin}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          </button>
        </header>
        <div class="logo-banner">
          <img src="신설오름메뉴판로고.png" alt="신설오름" class="logo-banner-img">
        </div>
      </div>
      <div id="menu-grid" class="menu-grid">
        <div class="loading">${t.loading}</div>
      </div>
    `;

    page.querySelectorAll('.lang-switch-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentLang = btn.dataset.lang;
        renderMenuPage();
      });
    });

    document.getElementById('btn-admin').addEventListener('click', () => {
      if (Auth.isLoggedIn()) {
        App.navigate('admin');
      } else {
        App.showLoginModal();
      }
    });

    await loadMenuItems();
  }

  async function loadMenuItems() {
    const grid = document.getElementById('menu-grid');
    const t = I18N[currentLang];

    try {
      menuItems = await SupabaseAPI.fetchMenuItems();

      if (menuItems.length === 0) {
        grid.innerHTML = `<div class="empty-state">${t.noMenu}</div>`;
        return;
      }

      grid.innerHTML = menuItems.map(item => createMenuCard(item)).join('');
      grid.querySelectorAll('.menu-card').forEach((card, idx) => {
        card.addEventListener('click', () => showDetailModal(menuItems[idx]));
      });
    } catch (err) {
      console.error('[MenuPage] 로드 실패:', err);
      grid.innerHTML = `
        <div class="empty-state error">
          <p style="font-size:1.1rem;margin-bottom:12px;">⚠️ 데이터를 불러올 수 없습니다</p>
          <p style="font-size:0.85rem;color:#999;word-break:break-all;">${err.message}</p>
          <p style="font-size:0.8rem;color:#aaa;margin-top:16px;">
            💡 file://로 열었다면, Cursor에서 Live Server 확장 설치 후<br>
            index.html 우클릭 → "Open with Live Server"로 열어주세요.
          </p>
        </div>`;
    }
  }

  const FALLBACK_IMAGE = '신설오름메뉴판로고.png';

  function getImageUrl(item) {
    if (item.file_url) return item.file_url;
    if (item.storage_path) return SupabaseAPI.getPublicUrl(item.storage_path);
    return FALLBACK_IMAGE;
  }

  function getDisplayName(item, lang) {
    const name = item[`name_${lang}`] || item.name_ko || '';
    const nameKo = item.name_ko || '';
    if (lang !== 'ko' && nameKo && name !== nameKo) {
      return `${name} <span class="card-name-ko">(${nameKo})</span>`;
    }
    return name;
  }

  function createMenuCard(item) {
    const lang = currentLang;
    const displayName = getDisplayName(item, lang);
    const intro = item[`intro_${lang}`] || item.intro_ko || '';
    const price = formatPrice(item.price);
    const imgUrl = getImageUrl(item);
    const t = I18N[currentLang];

    return `
      <div class="menu-card">
        <div class="card-image-wrap">
          <img class="card-image" src="${imgUrl}" alt="${item.name_ko || ''}" loading="lazy"
               onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 300 200%22><rect fill=%22%23f0f0f0%22 width=%22300%22 height=%22200%22/><text x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-size=%2216%22>No Image</text></svg>'">
        </div>
        <div class="card-body">
          <h3 class="card-name">${displayName}</h3>
          <p class="card-intro">${intro}</p>
          ${price ? `<div class="card-price">${price}<span class="price-unit">${t.price}</span></div>` : ''}
        </div>
      </div>
    `;
  }

  function showDetailModal(item) {
    const lang = currentLang;
    const displayName = getDisplayName(item, lang);
    const intro = item[`intro_${lang}`] || item.intro_ko || '';
    const price = formatPrice(item.price);
    const imgUrl = getImageUrl(item);
    const t = I18N[currentLang];

    const modal = document.getElementById('modal-detail');
    modal.innerHTML = `
      <div class="modal-overlay" id="detail-overlay"></div>
      <div class="modal-content detail-modal-content">
        <button class="detail-close-btn" id="detail-close">&times;</button>
        <div class="detail-image-wrap">
          <img class="detail-image" src="${imgUrl}" alt="${item.name_ko || ''}"
               onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 300%22><rect fill=%22%23f0f0f0%22 width=%22400%22 height=%22300%22/><text x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-size=%2216%22>No Image</text></svg>'">
        </div>
        <div class="detail-body">
          <h2 class="detail-name">${displayName}</h2>
          <p class="detail-intro">${intro}</p>
          ${price ? `<div class="detail-price">${price}<span class="price-unit">${t.price}</span></div>` : ''}
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    const closeModal = () => {
      modal.classList.add('hidden');
      document.body.style.overflow = '';
    };
    modal.addEventListener('click', closeModal);
  }

  return { renderMenuPage, getLang, setLang, loadMenuItems };
})();
