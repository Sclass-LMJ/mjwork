const SupabaseAPI = (() => {
  const baseURL = CONFIG.SUPABASE_URL;
  const apiKey = CONFIG.SUPABASE_KEY;
  const bucket = CONFIG.STORAGE_BUCKET;

  function headers(contentType = 'application/json') {
    const h = {
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`
    };
    if (contentType) h['Content-Type'] = contentType;
    return h;
  }

  async function fetchMenuItems() {
    const url = `${baseURL}/rest/v1/menu_items?select=*&order=order.asc.nullslast,created_at.desc`;
    console.log('[Supabase] GET', url);
    let res;
    try {
      res = await fetch(url, { headers: headers() });
    } catch (e) {
      throw new Error(`네트워크 오류 - file:// 대신 로컬 서버(Live Server)로 열어주세요. (${e.message})`);
    }
    if (!res.ok) {
      const body = await res.text();
      console.error('[Supabase] 응답 오류:', res.status, body);
      throw new Error(`메뉴 조회 실패 (${res.status}): ${body}`);
    }
    const data = await res.json();
    console.log('[Supabase] 메뉴 데이터:', data.length, '건');
    return data;
  }

  async function createMenuItem(data) {
    const res = await fetch(`${baseURL}/rest/v1/menu_items`, {
      method: 'POST',
      headers: { ...headers(), 'Prefer': 'return=representation' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`메뉴 추가 실패: ${err}`);
    }
    return res.json();
  }

  async function updateMenuItem(id, data) {
    const res = await fetch(`${baseURL}/rest/v1/menu_items?id=eq.${id}`, {
      method: 'PATCH',
      headers: { ...headers(), 'Prefer': 'return=representation' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`메뉴 수정 실패: ${err}`);
    }
    return res.json();
  }

  async function deleteMenuItem(id) {
    const res = await fetch(`${baseURL}/rest/v1/menu_items?id=eq.${id}`, {
      method: 'DELETE',
      headers: headers()
    });
    if (!res.ok) throw new Error(`메뉴 삭제 실패: ${res.status}`);
    return true;
  }

  async function uploadImage(file) {
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${timestamp}_${safeName}`;

    const res = await fetch(`${baseURL}/storage/v1/object/${bucket}/${storagePath}`, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': file.type,
        'x-upsert': 'true'
      },
      body: file
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`이미지 업로드 실패: ${err}`);
    }

    const fileUrl = `${baseURL}/storage/v1/object/public/${bucket}/${storagePath}`;
    return { storagePath, fileUrl };
  }

  async function deleteImage(storagePath) {
    if (!storagePath) return;
    const res = await fetch(`${baseURL}/storage/v1/object/${bucket}/${storagePath}`, {
      method: 'DELETE',
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`
      }
    });
    if (!res.ok) {
      console.warn('이미지 삭제 실패:', res.status);
    }
  }

  function getPublicUrl(storagePath) {
    if (!storagePath) return '';
    return `${baseURL}/storage/v1/object/public/${bucket}/${storagePath}`;
  }

  return {
    fetchMenuItems,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    uploadImage,
    deleteImage,
    getPublicUrl
  };
})();
