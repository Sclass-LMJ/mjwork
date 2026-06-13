const AdminPage = (() => {
  let menuItems = [];
  let editingId = null;

  async function render() {
    const page = document.getElementById('page-admin');

    page.innerHTML = `
      <header class="admin-header">
        <button class="header-btn" id="btn-back-menu">← 메뉴판으로</button>
        <h1 class="admin-title">관리자 페이지</h1>
        <button class="header-btn btn-logout" id="btn-logout">로그아웃</button>
      </header>
      <div class="admin-content">
        <div class="admin-toolbar">
          <button class="btn-primary" id="btn-add-menu">+ 메뉴 추가</button>
        </div>
        <div id="admin-list" class="admin-list">
          <div class="loading">로딩 중...</div>
        </div>
      </div>
      <!-- Add/Edit Modal -->
      <div class="modal hidden" id="modal-form">
        <div class="modal-overlay"></div>
        <div class="modal-content modal-form-content">
          <h2 id="form-title">메뉴 추가</h2>
          <form id="menu-form" class="menu-form">
            <div class="form-section">
              <label class="form-label">이미지</label>
              <div class="image-upload-area" id="image-upload-area">
                <input type="file" id="form-image" accept="image/*" class="file-input">
                <div class="upload-placeholder" id="upload-placeholder">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <path d="M21 15l-5-5L5 21"/>
                  </svg>
                  <span>클릭하여 이미지 선택</span>
                </div>
                <img id="image-preview" class="image-preview hidden" alt="미리보기">
              </div>
            </div>

            <div class="form-row form-row-3">
              <div class="form-section">
                <label class="form-label">메뉴 이름 (한국어) *</label>
                <input type="text" id="form-name-ko" required class="form-input" placeholder="예: 떡볶이">
              </div>
              <div class="form-section">
                <label class="form-label">가격 (원) *</label>
                <input type="number" id="form-price" required class="form-input" placeholder="예: 5000" min="0">
              </div>
              <div class="form-section">
                <label class="form-label">표시 순서</label>
                <input type="number" id="form-order" class="form-input" placeholder="예: 1" min="0">
              </div>
            </div>

            <div class="form-section">
              <label class="form-label">메뉴 소개 (한국어) *</label>
              <textarea id="form-intro-ko" required class="form-input form-textarea" placeholder="예: 매콤하고 달콤한 전통 떡볶이"></textarea>
            </div>

            <div class="lang-section-divider">🇺🇸 English</div>
            <div class="form-row">
              <div class="form-section">
                <label class="form-label">Menu Name *</label>
                <input type="text" id="form-name-en" required class="form-input" placeholder="Menu name in English">
              </div>
              <div class="form-section">
                <label class="form-label">Description *</label>
                <textarea id="form-intro-en" required class="form-input form-textarea" placeholder="Menu description in English"></textarea>
              </div>
            </div>

            <div class="lang-section-divider">🇯🇵 日本語</div>
            <div class="form-row">
              <div class="form-section">
                <label class="form-label">メニュー名 *</label>
                <input type="text" id="form-name-ja" required class="form-input" placeholder="メニュー名">
              </div>
              <div class="form-section">
                <label class="form-label">説明 *</label>
                <textarea id="form-intro-ja" required class="form-input form-textarea" placeholder="メニューの説明"></textarea>
              </div>
            </div>

            <div class="lang-section-divider">🇨🇳 中文</div>
            <div class="form-row">
              <div class="form-section">
                <label class="form-label">菜品名称 *</label>
                <input type="text" id="form-name-zh" required class="form-input" placeholder="菜品名称">
              </div>
              <div class="form-section">
                <label class="form-label">菜品介绍 *</label>
                <textarea id="form-intro-zh" required class="form-input form-textarea" placeholder="菜品介绍"></textarea>
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="btn-secondary" id="btn-form-cancel">취소</button>
              <button type="submit" class="btn-primary" id="btn-form-save">저장</button>
            </div>
          </form>
        </div>
      </div>
    `;

    bindEvents();
    await loadItems();
  }

  function bindEvents() {
    document.getElementById('btn-back-menu').addEventListener('click', () => {
      App.navigate('menu');
    });

    document.getElementById('btn-logout').addEventListener('click', () => {
      Auth.logout();
      App.navigate('menu');
    });

    document.getElementById('btn-add-menu').addEventListener('click', () => openForm());

    document.getElementById('btn-form-cancel').addEventListener('click', closeForm);
    document.getElementById('modal-form').querySelector('.modal-overlay').addEventListener('click', closeForm);

    const fileInput = document.getElementById('form-image');
    fileInput.addEventListener('click', (e) => e.stopPropagation());
    fileInput.addEventListener('change', handleImagePreview);

    document.getElementById('menu-form').addEventListener('submit', handleSubmit);
  }

  async function loadItems() {
    const list = document.getElementById('admin-list');
    try {
      menuItems = await SupabaseAPI.fetchMenuItems();
      if (menuItems.length === 0) {
        list.innerHTML = '<div class="empty-state">등록된 메뉴가 없습니다. "메뉴 추가" 버튼을 눌러 첫 메뉴를 등록하세요.</div>';
        return;
      }
      list.innerHTML = menuItems.map(item => createAdminCard(item)).join('');
      list.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => {
          const item = menuItems.find(m => m.id === btn.dataset.id);
          if (item) openForm(item);
        });
      });
      list.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', () => handleDelete(btn.dataset.id, btn.dataset.storage));
      });
    } catch (err) {
      console.error(err);
      list.innerHTML = `<div class="empty-state error">오류: ${err.message}</div>`;
    }
  }

  function getAdminImageUrl(item) {
    if (item.file_url) return item.file_url;
    if (item.storage_path) return SupabaseAPI.getPublicUrl(item.storage_path);
    return '신설오름메뉴판로고.png';
  }

  function createAdminCard(item) {
    const imgUrl = getAdminImageUrl(item);
    const price = item.price ? Number(item.price).toLocaleString() + '원' : '-';

    return `
      <div class="admin-card">
        <div class="admin-card-image">
          <img src="${imgUrl}" alt="${item.name_ko || ''}" loading="lazy"
               onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23f5f5f5%22 width=%22100%22 height=%22100%22/><text x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23ccc%22 font-size=%2212%22>No Img</text></svg>'">
        </div>
        <div class="admin-card-info">
          <h3 class="admin-card-name">${item.order != null ? `<span class="order-badge">${item.order}</span> ` : ''}${item.name_ko || '(이름 없음)'}</h3>
          <p class="admin-card-intro">${item.intro_ko || ''}</p>
          <div class="admin-card-meta">
            <span class="admin-card-price">${price}</span>
          </div>
          <div class="admin-card-langs">
            ${item.name_en ? '<span class="lang-tag">EN</span>' : ''}
            ${item.name_ja ? '<span class="lang-tag">JA</span>' : ''}
            ${item.name_zh ? '<span class="lang-tag">ZH</span>' : ''}
          </div>
        </div>
        <div class="admin-card-actions">
          <button class="btn-icon btn-edit" data-id="${item.id}" title="수정">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="btn-icon btn-delete" data-id="${item.id}" data-storage="${item.storage_path || ''}" title="삭제">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  function openForm(item = null) {
    editingId = item ? item.id : null;
    const modal = document.getElementById('modal-form');
    const title = document.getElementById('form-title');
    title.textContent = item ? '메뉴 수정' : '메뉴 추가';

    document.getElementById('form-name-ko').value = item?.name_ko || '';
    document.getElementById('form-name-en').value = item?.name_en || '';
    document.getElementById('form-name-ja').value = item?.name_ja || '';
    document.getElementById('form-name-zh').value = item?.name_zh || '';
    document.getElementById('form-intro-ko').value = item?.intro_ko || '';
    document.getElementById('form-intro-en').value = item?.intro_en || '';
    document.getElementById('form-intro-ja').value = item?.intro_ja || '';
    document.getElementById('form-intro-zh').value = item?.intro_zh || '';
    document.getElementById('form-price').value = item?.price || '';
    document.getElementById('form-order').value = item?.order ?? '';
    document.getElementById('form-image').value = '';

    const preview = document.getElementById('image-preview');
    const placeholder = document.getElementById('upload-placeholder');

    if (item && (item.file_url || item.storage_path)) {
      preview.src = item.file_url || SupabaseAPI.getPublicUrl(item.storage_path);
      preview.classList.remove('hidden');
      placeholder.classList.add('hidden');
    } else {
      preview.classList.add('hidden');
      placeholder.classList.remove('hidden');
    }

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeForm() {
    editingId = null;
    document.getElementById('modal-form').classList.add('hidden');
    document.body.style.overflow = '';
  }

  function handleImagePreview(e) {
    const file = e.target.files[0];
    if (!file) return;
    const preview = document.getElementById('image-preview');
    const placeholder = document.getElementById('upload-placeholder');
    const reader = new FileReader();
    reader.onload = (ev) => {
      preview.src = ev.target.result;
      preview.classList.remove('hidden');
      placeholder.classList.add('hidden');
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const saveBtn = document.getElementById('btn-form-save');
    saveBtn.disabled = true;
    saveBtn.textContent = '저장 중...';

    try {
      const file = document.getElementById('form-image').files[0];
      let storagePath = null;
      let fileUrl = null;

      if (file) {
        const uploadResult = await SupabaseAPI.uploadImage(file);
        storagePath = uploadResult.storagePath;
        fileUrl = uploadResult.fileUrl;
      }

      const data = {
        name_ko: document.getElementById('form-name-ko').value.trim(),
        name_en: document.getElementById('form-name-en').value.trim(),
        name_ja: document.getElementById('form-name-ja').value.trim(),
        name_zh: document.getElementById('form-name-zh').value.trim(),
        intro_ko: document.getElementById('form-intro-ko').value.trim(),
        intro_en: document.getElementById('form-intro-en').value.trim(),
        intro_ja: document.getElementById('form-intro-ja').value.trim(),
        intro_zh: document.getElementById('form-intro-zh').value.trim(),
        price: parseInt(document.getElementById('form-price').value, 10) || 0,
        order: document.getElementById('form-order').value.trim() !== '' ? parseInt(document.getElementById('form-order').value, 10) : null
      };

      if (storagePath) {
        data.storage_path = storagePath;
        data.file_url = fileUrl;
      }

      if (editingId) {
        if (file) {
          const oldItem = menuItems.find(m => m.id === editingId);
          if (oldItem?.storage_path) {
            await SupabaseAPI.deleteImage(oldItem.storage_path);
          }
        }
        await SupabaseAPI.updateMenuItem(editingId, data);
      } else {
        if (!storagePath) {
          data.storage_path = '';
          data.file_url = '';
        }
        await SupabaseAPI.createMenuItem(data);
      }

      closeForm();
      await loadItems();
    } catch (err) {
      console.error(err);
      alert('저장 실패: ' + err.message);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = '저장';
    }
  }

  async function handleDelete(id, storagePath) {
    if (!confirm('정말 이 메뉴를 삭제하시겠습니까?')) return;
    try {
      if (storagePath) await SupabaseAPI.deleteImage(storagePath);
      await SupabaseAPI.deleteMenuItem(id);
      await loadItems();
    } catch (err) {
      console.error(err);
      alert('삭제 실패: ' + err.message);
    }
  }

  return { render };
})();
