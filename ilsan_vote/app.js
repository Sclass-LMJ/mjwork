// SUPABASE_URL, SUPABASE_ANON 은 config.js 에서 주입됩니다
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ════════════════════════════════════
//  ② 상수 & 상태
// ════════════════════════════════════
const ADMIN_PW     = '3229';
const LS_VOTED_KEY = 'cleankps_voted';

let settings = {
  공고마감여부:   'N',
  투표진행여부:   'N',
  투표마감여부:   'N',
  투표방식:       '무기명',
  최대체크항목수:  1,
  중복투표허용:   'N'
};

let ruleList         = [];
let checkedIds       = new Set();
let currentTab       = 0;
let realtimeSub      = null;
let stepperValue     = 1;
let selectedVoteType = '무기명';
let toastTimer       = null;

// ════════════════════════════════════
//  ③ 초기화
// ════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  applySettingsToUI();
  bindEvents();
  await loadList();
  subscribeRealtime();

  // 투표진행 ON(투표마감 아님)이면 첫 진입 시 투표(리스트) 탭을 활성화
  const voteOpen   = settings.투표진행여부 === 'Y';
  const voteClosed = settings.투표마감여부 === 'Y';
  if (voteOpen && !voteClosed) {
    switchTab(1);
  }
});

// ════════════════════════════════════
//  ④ 설정 로드
// ════════════════════════════════════
async function loadSettings() {
  try {
    const { data, error } = await sb
      .from('관리자설정')
      .select('*')
      .eq('id', 1)
      .single();
    if (error) throw error;
    if (data) {
      settings = { ...settings, ...data };
      console.log('[설정 로드 성공]', settings);
    }
  } catch (e) {
    console.error('[설정 로드 실패] 기본값(전부 N)으로 동작합니다:', e.message);
    showToast('설정을 불러오지 못했습니다. 새로고침 해주세요.', 'error');
  }
}

// ════════════════════════════════════
//  ⑤ UI에 설정 반영
// ════════════════════════════════════
function applySettingsToUI() {
  const isClosed     = settings.공고마감여부   === 'Y';
  const voteOpen     = settings.투표진행여부   === 'Y';
  const voteClosed   = settings.투표마감여부   === 'Y';
  const maxCheck     = settings.최대체크항목수 || 1;
  const dupAllowed   = settings.중복투표허용   === 'Y';
  const alreadyVoted = !dupAllowed && !!localStorage.getItem(LS_VOTED_KEY);

  // ── 1탭: 공모 상태
  const submitBtn    = document.getElementById('submit-btn');
  const ruleInput    = document.getElementById('rule-input');
  const closedNotice = document.getElementById('submit-closed-notice');
  const submitBadge  = document.getElementById('submit-badge');
  const submitLabel  = document.getElementById('submit-label');

  if (isClosed) {
    submitBtn.disabled         = true;
    ruleInput.disabled         = true;
    closedNotice.style.display = 'block';
    submitBadge.className      = 'badge badge-red';
    submitBadge.innerHTML      = '🔴 공모마감';
    submitLabel.textContent    = '자율수칙 기재 (공모마감)';
  } else {
    submitBtn.disabled         = false;
    ruleInput.disabled         = false;
    closedNotice.style.display = 'none';
    submitBadge.className      = 'badge badge-mint';
    submitBadge.innerHTML      = '<span class="badge-dot"></span>공모중';
    submitLabel.textContent    = '자율수칙 기재 (공모중)';
  }

  // ── 2탭: 투표 상태 배지 & 안내문
  const voteStatusBadge = document.getElementById('vote-status-badge');
  const listSubInfo     = document.getElementById('list-sub-info');
  const voteFab         = document.getElementById('vote-fab');
  const votedNoticeWrap = document.getElementById('voted-notice-wrap');

  if (voteClosed) {
    voteStatusBadge.style.display = 'inline-flex';
    voteStatusBadge.className     = 'badge badge-red';
    voteStatusBadge.innerHTML     = '🔴 투표마감';
    listSubInfo.textContent       = '투표가 마감되었습니다. 결과는 통계 탭에서 확인하세요.';
    voteFab.style.display         = 'none';
    votedNoticeWrap.style.display = 'none';
  } else if (voteOpen) {
    voteStatusBadge.style.display = 'inline-flex';
    voteStatusBadge.className     = 'badge badge-sky';
    voteStatusBadge.innerHTML     = '<span class="badge-dot"></span>투표진행중';
    if (alreadyVoted) {
      listSubInfo.textContent       = '이미 투표하셨습니다. 감사합니다.';
      voteFab.style.display         = 'none';
      votedNoticeWrap.style.display = 'block';
    } else {
      listSubInfo.textContent       = `최대 ${maxCheck}개 항목을 선택한 후 투표 제출 버튼을 눌러주세요.`;
      voteFab.style.display         = 'flex';
      votedNoticeWrap.style.display = 'none';
    }
  } else {
    voteStatusBadge.style.display = 'none';
    listSubInfo.textContent       = '투표가 시작되면 항목을 선택할 수 있습니다.';
    voteFab.style.display         = 'none';
    votedNoticeWrap.style.display = 'none';
  }

  // 리스트 아이템 체크박스 활성/비활성 재렌더
  renderListItems();
}

// ════════════════════════════════════
//  ⑥ 자율수칙 목록 로드
// ════════════════════════════════════
async function loadList() {
  try {
    const { data, error } = await sb
      .from('자율수칙')
      .select('*')
      .eq('공개여부', 'Y')
      .order('created_at', { ascending: true });
    if (error) throw error;
    ruleList = data || [];
    renderListItems();
    updateListCount();
  } catch (e) {
    document.getElementById('list-container').innerHTML =
      `<div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <div class="empty-text">목록을 불러오지 못했습니다.<br>${e.message}</div>
      </div>`;
  }
}

// ════════════════════════════════════
//  ⑦ 리스트 렌더링
// ════════════════════════════════════
function renderListItems() {
  const container    = document.getElementById('list-container');
  const voteOpen     = settings.투표진행여부 === 'Y';
  const voteClosed   = settings.투표마감여부 === 'Y';
  const dupAllowed   = settings.중복투표허용 === 'Y';
  const alreadyVoted = !dupAllowed && !!localStorage.getItem(LS_VOTED_KEY);
  const canVote      = voteOpen && !voteClosed && !alreadyVoted;

  if (ruleList.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <div class="empty-text">아직 제출된 자율수칙이 없습니다.<br>첫 번째로 공모 탭에서 제출해 보세요!</div>
      </div>`;
    return;
  }

  container.innerHTML = ruleList.map(item => {
    const isChecked  = checkedIds.has(item.id);
    const isDisabled = !canVote;
    return `
      <div class="list-item ${isChecked ? 'checked' : ''} ${isDisabled ? 'disabled-item' : ''}"
           data-id="${item.id}" ${canVote ? 'onclick="toggleItem(this)"' : ''}>
        <div class="custom-check">
          <div class="custom-check-inner"></div>
        </div>
        <p class="list-item-text">${escapeHtml(item.내용)}</p>
      </div>`;
  }).join('');
}

function updateListCount() {
  document.getElementById('list-count-badge').textContent = `${ruleList.length}건`;
}

// ════════════════════════════════════
//  ⑧ 체크박스 토글
// ════════════════════════════════════
function toggleItem(el) {
  const id       = el.dataset.id;
  const maxCheck = settings.최대체크항목수 || 1;

  if (checkedIds.has(id)) {
    checkedIds.delete(id);
    el.classList.remove('checked');
  } else {
    if (checkedIds.size >= maxCheck) {
      showToast(`최대 ${maxCheck}개까지 선택할 수 있습니다.`, 'error');
      return;
    }
    checkedIds.add(id);
    el.classList.add('checked');
  }
}

// ════════════════════════════════════
//  ⑨ 자율수칙 제출
// ════════════════════════════════════
async function submitRule() {
  const input = document.getElementById('rule-input');
  const btn   = document.getElementById('submit-btn');
  const text  = input.value.trim();

  if (!text) {
    showToast('자율수칙 내용을 입력해 주세요.', 'error');
    return;
  }
  if (settings.공고마감여부 === 'Y') {
    showToast('공모가 마감되었습니다.', 'error');
    return;
  }

  setLoading(btn, true);
  try {
    const { error } = await sb
      .from('자율수칙')
      .insert({ 내용: text, 공개여부: 'Y' });
    if (error) throw error;
    input.value = '';
    showToast('자율수칙이 제출되었습니다! 감사합니다 😊', 'success');
  } catch (e) {
    showToast('제출 중 오류가 발생했습니다. 다시 시도해 주세요.', 'error');
  } finally {
    setLoading(btn, false);
  }
}

// ════════════════════════════════════
//  ⑩ 투표 제출
// ════════════════════════════════════
async function submitVote(empId = null) {
  if (checkedIds.size === 0) {
    showToast('1개 이상 항목을 선택해 주세요.', 'error');
    return;
  }

  const dupAllowed = settings.중복투표허용 === 'Y';
  const confirmBtn = document.getElementById('empid-confirm-btn');
  const voteFab    = document.getElementById('vote-fab');
  setLoading(confirmBtn, true);
  setLoading(voteFab, true);

  try {
    // 중복투표허용 + 기명: 동일 사번이 이미 투표했는지 검사
    if (dupAllowed && settings.투표방식 === '기명') {
      const { data: existing, error: dupErr } = await sb
        .from('투표')
        .select('id')
        .eq('사번', empId)
        .limit(1);
      if (dupErr) throw dupErr;
      if (existing && existing.length > 0) {
        showToast('이미 투표한 사번입니다.', 'error');
        return;
      }
    }

    const rows = Array.from(checkedIds).map(id => ({
      자율수칙_id: id,
      사번: empId || null
    }));
    const { error } = await sb.from('투표').insert(rows);
    if (error) throw error;

    // 중복투표허용 모드에서는 로컬스토리지 기록을 남기지 않음
    if (!dupAllowed) {
      localStorage.setItem(LS_VOTED_KEY, 'true');
    }
    checkedIds.clear();
    showToast('투표가 완료되었습니다! 감사합니다 🎉', 'success');
    closeEmpIdModal();
    applySettingsToUI();
    renderListItems();
    if (currentTab === 2) loadStats();
  } catch (e) {
    showToast('투표 중 오류가 발생했습니다. 다시 시도해 주세요.', 'error');
  } finally {
    setLoading(confirmBtn, false);
    setLoading(voteFab, false);
  }
}

// ════════════════════════════════════
//  ⑪ 통계 로드
// ════════════════════════════════════
async function loadStats() {
  const container = document.getElementById('stats-container');
  container.innerHTML = `<div class="loading-state"><div class="loading-ring"></div>통계를 불러오는 중입니다…</div>`;

  try {
    const { data: votes, error: vErr } = await sb
      .from('투표')
      .select('자율수칙_id');
    if (vErr) throw vErr;

    const { data: rules, error: rErr } = await sb
      .from('자율수칙')
      .select('id, 내용')
      .eq('공개여부', 'Y');
    if (rErr) throw rErr;

    // 득표 집계
    const countMap = {};
    (votes || []).forEach(v => {
      countMap[v.자율수칙_id] = (countMap[v.자율수칙_id] || 0) + 1;
    });

    const totalVotes = votes ? votes.length : 0;
    document.getElementById('total-votes-num').innerHTML =
      `${totalVotes}<span class="stats-total-unit">표</span>`;

    if (!rules || rules.length === 0) {
      container.innerHTML = `<div class="stats-empty"><div class="stats-empty-icon">📭</div>아직 자율수칙이 없습니다.</div>`;
      return;
    }

    // 득표수 기준 내림차순 정렬, 0표 항목도 표시
    const sorted = rules
      .map(r => ({ ...r, votes: countMap[r.id] || 0 }))
      .sort((a, b) => b.votes - a.votes);

    if (totalVotes === 0) {
      container.innerHTML = `
        <div class="stats-empty">
          <div class="stats-empty-icon">🗳️</div>
          아직 투표 결과가 없습니다.<br>투표가 시작되면 결과를 확인할 수 있습니다.
        </div>`;
      return;
    }

    const rankIcons = ['🥇', '🥈', '🥉'];
    container.innerHTML = sorted.map((item, idx) => {
      const pct        = totalVotes > 0 ? ((item.votes / totalVotes) * 100).toFixed(1) : 0;
      const gaugeClass = idx === 0 ? 'gauge-1' : idx === 1 ? 'gauge-2' : idx === 2 ? 'gauge-3' : 'gauge-n';
      const pctColor   = idx === 0 ? 'color:var(--navy)' : idx === 1 ? 'color:var(--sky)' : idx === 2 ? 'color:var(--mint)' : 'color:var(--sub)';
      const rankMark   = idx < 3
        ? `<span class="stat-rank">${rankIcons[idx]}</span>`
        : `<span class="stat-rank-num">${idx + 1}</span>`;
      return `
        <div class="stat-card">
          <div class="stat-card-header">
            ${rankMark}
            <p class="stat-text">${escapeHtml(item.내용)}</p>
          </div>
          <div class="stat-numbers">
            <span class="stat-votes">${item.votes}</span>
            <span class="stat-votes-unit">표</span>
            <span class="stat-pct" style="${pctColor}">${pct}%</span>
          </div>
          <div class="gauge-track">
            <div class="gauge-fill ${gaugeClass}" data-width="${pct}"></div>
          </div>
        </div>`;
    }).join('');

    // 게이지 애니메이션
    requestAnimationFrame(() => {
      document.querySelectorAll('.gauge-fill[data-width]').forEach(el => {
        setTimeout(() => { el.style.width = el.dataset.width + '%'; }, 80);
      });
    });

  } catch (e) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <div class="empty-text">통계를 불러오지 못했습니다.<br>${e.message}</div>
      </div>`;
  }
}

// ════════════════════════════════════
//  ⑫ 관리자 설정 저장
// ════════════════════════════════════
async function saveAdminSettings() {
  const btn = document.getElementById('admin-save-btn');
  setLoading(btn, true);

  const payload = {
    공고마감여부:   document.getElementById('toggle-deadline').checked   ? 'Y' : 'N',
    투표진행여부:   document.getElementById('toggle-vote-open').checked   ? 'Y' : 'N',
    투표마감여부:   document.getElementById('toggle-vote-close').checked  ? 'Y' : 'N',
    투표방식:       selectedVoteType,
    최대체크항목수: stepperValue,
    중복투표허용:   document.getElementById('toggle-dup-vote').checked     ? 'Y' : 'N'
  };

  try {
    const { data, error } = await sb
      .from('관리자설정')
      .update(payload)
      .eq('id', 1)
      .select();
    if (error) throw error;

    if (!data || data.length === 0) {
      console.error('[설정 저장 실패] 반영된 행이 없습니다. RLS UPDATE 정책 또는 id=1 행 존재 여부를 확인하세요.');
      showToast('저장에 실패했습니다. 권한(RLS) 설정을 확인해 주세요.', 'error');
      return;
    }

    settings = { ...settings, ...data[0] };
    console.log('[설정 저장 성공]', settings);
    closeAdminModal();
    applySettingsToUI();
    showToast('설정이 저장되었습니다.', 'success');
  } catch (e) {
    console.error('[설정 저장 오류]', e.message);
    showToast('저장 중 오류가 발생했습니다.', 'error');
  } finally {
    setLoading(btn, false);
  }
}

// ════════════════════════════════════
//  ⑬ Realtime 구독 (자율수칙 테이블)
// ════════════════════════════════════
function subscribeRealtime() {
  realtimeSub = sb
    .channel('cleankps-changes')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: '자율수칙' },
      payload => {
        if (payload.new && payload.new.공개여부 === 'Y') {
          ruleList.push(payload.new);
          renderListItems();
          updateListCount();
        }
      }
    )
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: '투표' },
      () => {
        // 통계 탭을 보고 있으면 즉시 갱신
        if (currentTab === 2) loadStats();
      }
    )
    .subscribe();
}

// ════════════════════════════════════
//  ⑭ 탭 전환
// ════════════════════════════════════
function switchTab(idx) {
  document.querySelectorAll('.tab-btn').forEach((b, i) => {
    b.classList.toggle('active', i === idx);
  });
  document.querySelectorAll('.tab-panel').forEach((p, i) => {
    p.classList.toggle('active', i === idx);
  });

  currentTab = idx;

  const voteFab      = document.getElementById('vote-fab');
  const voteOpen     = settings.투표진행여부 === 'Y';
  const voteClosed   = settings.투표마감여부 === 'Y';
  const dupAllowed   = settings.중복투표허용 === 'Y';
  const alreadyVoted = !dupAllowed && !!localStorage.getItem(LS_VOTED_KEY);
  const canVote      = voteOpen && !voteClosed && !alreadyVoted;

  voteFab.style.display = (idx === 1 && canVote) ? 'flex' : 'none';

  if (idx === 2) loadStats();
}

// ════════════════════════════════════
//  ⑮ 관리자 모달 열기 / 닫기
// ════════════════════════════════════
function openPwModal() {
  document.getElementById('pw-input').value = '';
  document.getElementById('pw-modal').classList.add('open');
  setTimeout(() => document.getElementById('pw-input').focus(), 100);
}

function closePwModal() {
  document.getElementById('pw-modal').classList.remove('open');
}

function confirmPw() {
  const pw = document.getElementById('pw-input').value;
  if (pw !== ADMIN_PW) {
    showToast('비밀번호가 올바르지 않습니다.', 'error');
    document.getElementById('pw-input').value = '';
    return;
  }
  closePwModal();
  openAdminModal();
}

function openAdminModal() {
  // 현재 설정값을 모달에 반영
  document.getElementById('toggle-deadline').checked   = settings.공고마감여부 === 'Y';
  document.getElementById('toggle-vote-open').checked  = settings.투표진행여부 === 'Y';
  document.getElementById('toggle-vote-close').checked = settings.투표마감여부 === 'Y';
  document.getElementById('toggle-dup-vote').checked   = settings.중복투표허용 === 'Y';

  selectedVoteType = settings.투표방식 || '무기명';
  document.querySelectorAll('#vote-type-group .radio-opt').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.val === selectedVoteType);
  });

  stepperValue = settings.최대체크항목수 || 1;
  document.getElementById('stepper-val').textContent = stepperValue;

  document.getElementById('admin-modal').classList.add('open');
}

function closeAdminModal() {
  document.getElementById('admin-modal').classList.remove('open');
}

// ════════════════════════════════════
//  ⑯ 사번 모달 열기 / 닫기
// ════════════════════════════════════
function openEmpIdModal() {
  document.getElementById('empid-input').value = '';
  document.getElementById('empid-modal').classList.add('open');
  setTimeout(() => document.getElementById('empid-input').focus(), 100);
}

function closeEmpIdModal() {
  document.getElementById('empid-modal').classList.remove('open');
}

// ════════════════════════════════════
//  ⑰ 투표 FAB 클릭 처리
// ════════════════════════════════════
function handleVoteFab() {
  if (checkedIds.size === 0) {
    showToast('1개 이상 항목을 선택해 주세요.', 'error');
    return;
  }
  if (settings.투표방식 === '기명') {
    openEmpIdModal();
  } else {
    submitVote(null);
  }
}

// ════════════════════════════════════
//  ⑱ 유틸: 토스트 메시지
// ════════════════════════════════════
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type}`;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

// ════════════════════════════════════
//  ⑲ 유틸: 버튼 로딩 상태
// ════════════════════════════════════
function setLoading(btn, on) {
  if (!btn) return;
  btn.disabled = on;
  btn.classList.toggle('loading', on);
}

// ════════════════════════════════════
//  ⑳ 유틸: XSS 방지
// ════════════════════════════════════
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ════════════════════════════════════
//  ㉑ 이벤트 바인딩
// ════════════════════════════════════
function bindEvents() {
  // 탭 전환
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(+btn.dataset.tab));
  });

  // 1탭: 자율수칙 제출
  document.getElementById('submit-btn').addEventListener('click', submitRule);

  // 1탭: 리스트 보기 버튼
  document.getElementById('goto-list-btn').addEventListener('click', () => switchTab(1));

  // 1탭: textarea에서 Enter(단독) → 제출, Shift+Enter → 줄바꿈
  document.getElementById('rule-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitRule();
    }
  });

  // 2탭: 투표 FAB
  document.getElementById('vote-fab').addEventListener('click', handleVoteFab);

  // 관리자 FAB → 비밀번호 모달
  document.getElementById('admin-fab').addEventListener('click', openPwModal);

  // 비밀번호 모달: 확인 / 취소
  document.getElementById('pw-confirm-btn').addEventListener('click', confirmPw);
  document.getElementById('pw-cancel-btn').addEventListener('click', closePwModal);
  document.getElementById('pw-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closePwModal();
  });
  document.getElementById('pw-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmPw();
  });

  // 관리자 모달: 닫기
  document.getElementById('admin-modal-close').addEventListener('click', closeAdminModal);
  document.getElementById('admin-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeAdminModal();
  });

  // 관리자 모달: 저장
  document.getElementById('admin-save-btn').addEventListener('click', saveAdminSettings);

  // 관리자 모달: 토글 자동 연동
  document.getElementById('toggle-vote-open').addEventListener('change', function () {
    if (this.checked) {
      // 투표진행 ON → 공고마감 자동 Y
      document.getElementById('toggle-deadline').checked = true;
    }
  });

  document.getElementById('toggle-vote-close').addEventListener('change', function () {
    if (this.checked) {
      // 투표마감 ON → 투표진행 자동 OFF, 공고마감 자동 Y
      document.getElementById('toggle-vote-open').checked = false;
      document.getElementById('toggle-deadline').checked = true;
    }
  });

  // 관리자 모달: 투표방식 라디오
  document.querySelectorAll('#vote-type-group .radio-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      selectedVoteType = opt.dataset.val;
      document.querySelectorAll('#vote-type-group .radio-opt').forEach(o =>
        o.classList.toggle('active', o === opt)
      );
    });
  });

  // 관리자 모달: 최대 항목 수 스테퍼
  document.getElementById('stepper-minus').addEventListener('click', () => {
    if (stepperValue > 1) {
      stepperValue--;
      document.getElementById('stepper-val').textContent = stepperValue;
    }
  });
  document.getElementById('stepper-plus').addEventListener('click', () => {
    if (stepperValue < 20) {
      stepperValue++;
      document.getElementById('stepper-val').textContent = stepperValue;
    }
  });

  // 사번 모달: 취소
  document.getElementById('empid-cancel-btn').addEventListener('click', closeEmpIdModal);
  document.getElementById('empid-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeEmpIdModal();
  });

  // 사번 모달: 투표 제출
  document.getElementById('empid-confirm-btn').addEventListener('click', () => {
    const empId = document.getElementById('empid-input').value.trim();
    if (!empId) {
      showToast('사번을 입력해 주세요.', 'error');
      return;
    }
    submitVote(empId);
  });

  // 사번 모달: Enter 키 제출
  document.getElementById('empid-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('empid-confirm-btn').click();
  });
}
