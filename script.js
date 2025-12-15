/* script.js — login demo: valida campos y redirige según rol (simulación) */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    const pass = form.password.value.trim();
    const role = form.role.value;

    if (!email || !pass) {
      showError('Completa correo y contraseña.');
      return;
    }

    // Llamada real al backend
    clearError();
    try {
      // Use deployed backend URL for all frontend requests
      const API_BASE = 'https://parqueadero-sena.vercel.app';
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass, role })
      });

      // Some error responses may be empty or not JSON; handle gracefully
      const text = await res.text();
      let body = {};
      try { body = text ? JSON.parse(text) : {}; } catch (e) { body = { error: text || 'Error' }; }

      if (!res.ok) { showError(body.error || 'Email o contraseña incorrectos'); return; }
      // redirigir según respuesta del servidor
      if (body.redirect) window.location.href = body.redirect;
      else showError('Inicio de sesión correcto');
    } catch (err) { console.error(err); showError('Error comunicándose con el servidor'); }
  });

  function showError(msg) {
    let el = document.getElementById('loginError');
    if (!el) {
      el = document.createElement('div'); el.id = 'loginError'; el.style.color = 'red'; el.className = 'muted small';
      form.parentNode.insertBefore(el, form.nextSibling);
    }
    el.textContent = msg;
  }

  function clearError() { const el = document.getElementById('loginError'); if (el) el.textContent = ''; }
});
