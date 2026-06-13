const Auth = (() => {
  const SESSION_KEY = 'menuboard_admin';

  function isLoggedIn() {
    return sessionStorage.getItem(SESSION_KEY) === 'true';
  }

  function login(id, pw) {
    if (id === CONFIG.ADMIN_ID && pw === CONFIG.ADMIN_PW) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      return true;
    }
    return false;
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  return { isLoggedIn, login, logout };
})();
