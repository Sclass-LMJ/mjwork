const App = (() => {
  function init() {
    handleRoute();
    window.addEventListener('hashchange', handleRoute);
  }

  function handleRoute() {
    const hash = location.hash.replace('#', '') || 'menu';

    if (hash === 'admin' && !Auth.isLoggedIn()) {
      showLoginModal();
      return;
    }

    showPage(hash);
  }

  async function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    const target = document.getElementById(`page-${page}`);
    if (!target) {
      location.hash = 'menu';
      return;
    }
    target.classList.add('active');

    switch (page) {
      case 'menu':
        await MenuPage.renderMenuPage();
        break;
      case 'admin':
        await AdminPage.render();
        break;
    }
  }

  function navigate(page) {
    location.hash = page;
  }

  function showLoginModal() {
    const modal = document.getElementById('modal-login');
    const idInput = document.getElementById('login-id');
    const pwInput = document.getElementById('login-pw');
    const errorMsg = document.getElementById('login-error');

    idInput.value = '';
    pwInput.value = '';
    errorMsg.textContent = '';
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    idInput.focus();
  }

  function hideLoginModal() {
    document.getElementById('modal-login').classList.add('hidden');
    document.body.style.overflow = '';
  }

  function setupLoginModal() {
    const modal = document.getElementById('modal-login');

    document.getElementById('btn-login').addEventListener('click', handleLogin);
    document.getElementById('btn-login-cancel').addEventListener('click', hideLoginModal);
    modal.querySelector('.modal-overlay').addEventListener('click', hideLoginModal);

    document.getElementById('login-pw').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleLogin();
    });
    document.getElementById('login-id').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('login-pw').focus();
    });
  }

  function handleLogin() {
    const id = document.getElementById('login-id').value.trim();
    const pw = document.getElementById('login-pw').value.trim();
    const errorMsg = document.getElementById('login-error');

    if (Auth.login(id, pw)) {
      hideLoginModal();
      navigate('admin');
    } else {
      errorMsg.textContent = '아이디 또는 비밀번호가 올바르지 않습니다.';
      document.getElementById('login-pw').value = '';
      document.getElementById('login-pw').focus();
    }
  }

  async function testConnection() {
    try {
      const url = `${CONFIG.SUPABASE_URL}/rest/v1/menu_items?select=id&limit=1`;
      console.log('[진단] Supabase 연결 테스트:', url);
      const res = await fetch(url, {
        headers: {
          'apikey': CONFIG.SUPABASE_KEY,
          'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}`
        }
      });
      const body = await res.text();
      console.log(`[진단] 상태: ${res.status}, 응답: ${body}`);
      if (res.status === 401) {
        console.error('[진단] ❌ API Key가 올바르지 않습니다. Supabase 대시보드에서 anon/publishable key를 확인하세요.');
      } else if (res.status === 403) {
        console.error('[진단] ❌ 권한 없음. RLS 정책을 확인하세요.');
      } else if (res.ok) {
        const data = JSON.parse(body);
        if (data.length === 0) {
          console.warn('[진단] ⚠️ 응답은 성공이지만 데이터 0건. RLS가 활성화되어 있을 수 있습니다.');
        } else {
          console.log('[진단] ✅ 연결 성공!');
        }
      }
    } catch (e) {
      console.error('[진단] ❌ 네트워크 오류:', e.message);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupLoginModal();
    testConnection();
    init();
  });

  return { navigate, showLoginModal };
})();
