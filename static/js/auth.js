/**
 * TeamBuildingCity Auth & Favorites
 * Handles Supabase auth (email + Google), user profiles, and favorites.
 */

const SUPABASE_URL = 'https://dapvmhwqbvfwuibbbogm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_7fT1QnT07BkqIdWH8WC6kA_wAX6Fqrz';

let _supabase = null;
let _currentUser = null;

function getSupabase() {
  if (!_supabase && window.supabase) {
    _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return _supabase;
}

// ─── Auth State ────────────────────────────────────────────
async function initAuth() {
  const sb = getSupabase();
  if (!sb) return;

  // Listen for auth changes
  sb.auth.onAuthStateChange((event, session) => {
    _currentUser = session?.user || null;
    updateAuthUI();
    if (event === 'SIGNED_IN') loadUserFavorites();
    if (event === 'SIGNED_OUT') clearFavoritesUI();
  });

  // Check existing session
  const { data: { session } } = await sb.auth.getSession();
  _currentUser = session?.user || null;
  updateAuthUI();
  if (_currentUser) loadUserFavorites();
}

function updateAuthUI() {
  const loginBtn = document.getElementById('auth-login-btn');
  const userMenu = document.getElementById('auth-user-menu');
  const userName = document.getElementById('auth-user-name');

  if (!loginBtn || !userMenu) return;

  if (_currentUser) {
    loginBtn.style.display = 'none';
    userMenu.style.display = 'flex';
    const name = _currentUser.user_metadata?.full_name
      || _currentUser.user_metadata?.name
      || _currentUser.email?.split('@')[0]
      || 'User';
    userName.textContent = name;
  } else {
    loginBtn.style.display = 'inline-flex';
    userMenu.style.display = 'none';
  }
}

// ─── Auth Actions ──────────────────────────────────────────
async function signUpEmail(email, password, name) {
  const sb = getSupabase();
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } }
  });
  return { data, error };
}

async function signInEmail(email, password) {
  const sb = getSupabase();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  return { data, error };
}

async function signInGoogle() {
  const sb = getSupabase();
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/auth/callback' }
  });
  return { data, error };
}

async function signOut() {
  const sb = getSupabase();
  await sb.auth.signOut();
  _currentUser = null;
  updateAuthUI();
  clearFavoritesUI();
}

// ─── Auth Modal ────────────────────────────────────────────
function showAuthModal(mode) {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  switchAuthMode(mode || 'login');
}

function hideAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;
  modal.classList.remove('active');
  document.body.style.overflow = '';
  clearAuthErrors();
}

function switchAuthMode(mode) {
  const loginForm = document.getElementById('auth-login-form');
  const signupForm = document.getElementById('auth-signup-form');
  const loginTab = document.getElementById('auth-tab-login');
  const signupTab = document.getElementById('auth-tab-signup');

  if (mode === 'login') {
    loginForm.style.display = 'block';
    signupForm.style.display = 'none';
    loginTab.classList.add('active');
    signupTab.classList.remove('active');
  } else {
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
    loginTab.classList.remove('active');
    signupTab.classList.add('active');
  }
  clearAuthErrors();
}

function clearAuthErrors() {
  document.querySelectorAll('.auth-error').forEach(el => {
    el.textContent = '';
    el.style.display = 'none';
  });
}

function showAuthError(formId, msg) {
  const el = document.querySelector(`#${formId} .auth-error`);
  if (el) {
    el.textContent = msg;
    el.style.display = 'block';
  }
}

// ─── Form Handlers ─────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  const form = e.target;
  const email = form.querySelector('[name="email"]').value.trim();
  const password = form.querySelector('[name="password"]').value;
  const btn = form.querySelector('button[type="submit"]');

  btn.disabled = true;
  btn.textContent = 'Signing in...';
  clearAuthErrors();

  const { error } = await signInEmail(email, password);
  if (error) {
    showAuthError('auth-login-form', error.message);
    btn.disabled = false;
    btn.textContent = 'Sign In';
  } else {
    hideAuthModal();
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const form = e.target;
  const name = form.querySelector('[name="name"]').value.trim();
  const email = form.querySelector('[name="email"]').value.trim();
  const password = form.querySelector('[name="password"]').value;
  const btn = form.querySelector('button[type="submit"]');

  if (password.length < 6) {
    showAuthError('auth-signup-form', 'Password must be at least 6 characters.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Creating account...';
  clearAuthErrors();

  const { error } = await signUpEmail(email, password, name);
  if (error) {
    showAuthError('auth-signup-form', error.message);
    btn.disabled = false;
    btn.textContent = 'Create Account';
  } else {
    showAuthError('auth-signup-form', '');
    const successEl = document.querySelector('#auth-signup-form .auth-success');
    if (successEl) {
      successEl.textContent = 'Check your email for a confirmation link.';
      successEl.style.display = 'block';
    }
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
}

async function handleGoogleLogin() {
  clearAuthErrors();
  const { error } = await signInGoogle();
  if (error) {
    showAuthError('auth-login-form', error.message);
  }
}

// ─── Favorites ─────────────────────────────────────────────
let _userFavorites = new Set();

async function loadUserFavorites() {
  if (!_currentUser) return;
  const sb = getSupabase();
  const { data, error } = await sb
    .from('tbc_favorites')
    .select('vendor_id')
    .eq('user_id', _currentUser.id);

  if (!error && data) {
    _userFavorites = new Set(data.map(f => f.vendor_id));
    updateFavoriteButtons();
  }
}

function clearFavoritesUI() {
  _userFavorites = new Set();
  updateFavoriteButtons();
}

function updateFavoriteButtons() {
  document.querySelectorAll('[data-favorite-vendor]').forEach(btn => {
    const vid = btn.dataset.favoriteVendor;
    const isFav = _userFavorites.has(vid);
    btn.classList.toggle('is-favorite', isFav);
    btn.setAttribute('aria-label', isFav ? 'Remove from favorites' : 'Save to favorites');
    btn.querySelector('.fav-icon').innerHTML = isFav ? heartFilledSVG : heartOutlineSVG;
  });
}

async function toggleFavorite(vendorId, vendorName, metroSlug) {
  if (!_currentUser) {
    showAuthModal('login');
    return;
  }

  const sb = getSupabase();
  const isFav = _userFavorites.has(vendorId);

  if (isFav) {
    const { error } = await sb
      .from('tbc_favorites')
      .delete()
      .eq('user_id', _currentUser.id)
      .eq('vendor_id', vendorId);

    if (!error) {
      _userFavorites.delete(vendorId);
      updateFavoriteButtons();
    }
  } else {
    const { error } = await sb
      .from('tbc_favorites')
      .insert({
        user_id: _currentUser.id,
        vendor_id: vendorId,
        vendor_name: vendorName || '',
        metro_slug: metroSlug || ''
      });

    if (!error) {
      _userFavorites.add(vendorId);
      updateFavoriteButtons();
    }
  }
}

// ─── Favorites Page ────────────────────────────────────────
async function loadFavoritesPage() {
  const container = document.getElementById('favorites-list');
  if (!container) return;

  if (!_currentUser) {
    container.innerHTML = '<p class="favorites-empty">Sign in to see your saved places.</p>';
    return;
  }

  container.innerHTML = '<p class="favorites-loading">Loading your favorites...</p>';

  const sb = getSupabase();
  const { data, error } = await sb
    .from('tbc_favorites')
    .select('*')
    .eq('user_id', _currentUser.id)
    .order('created_at', { ascending: false });

  if (error) {
    container.innerHTML = '<p class="favorites-empty">Failed to load favorites.</p>';
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = '<p class="favorites-empty">No favorites yet. Browse listings and click the heart icon to save your favorites.</p>';
    return;
  }

  container.innerHTML = data.map(fav => `
    <div class="favorite-card">
      <a href="/cities/${fav.metro_slug}/${fav.vendor_id}/" class="favorite-link">
        <strong>${escapeHtml(fav.vendor_name || fav.vendor_id)}</strong>
      </a>
      <button class="btn-remove-fav" onclick="toggleFavorite('${fav.vendor_id}', '${escapeHtml(fav.vendor_name || '')}', '${fav.metro_slug || ''}'); this.closest('.favorite-card').remove();" aria-label="Remove favorite">
        &times;
      </button>
    </div>
  `).join('');
}

// ─── SVG Icons ─────────────────────────────────────────────
const heartOutlineSVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
const heartFilledSVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';

// ─── Helpers ───────────────────────────────────────────────
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ─── User Dropdown ─────────────────────────────────────────
function toggleUserMenu() {
  const dropdown = document.getElementById('user-dropdown');
  if (dropdown) dropdown.classList.toggle('active');
}

// Close dropdown on outside click
document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('user-dropdown');
  const userMenu = document.getElementById('auth-user-menu');
  if (dropdown && userMenu && !userMenu.contains(e.target)) {
    dropdown.classList.remove('active');
  }
});

// ─── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initAuth();

  // Auth modal event listeners
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.querySelector('.auth-modal-overlay')?.addEventListener('click', hideAuthModal);
    modal.querySelector('.auth-modal-close')?.addEventListener('click', hideAuthModal);
  }

  const loginForm = document.getElementById('login-form');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);

  const signupForm = document.getElementById('signup-form');
  if (signupForm) signupForm.addEventListener('submit', handleSignup);

  // Favorites page
  if (document.getElementById('favorites-list')) {
    // Wait for auth to settle, then load favorites page
    setTimeout(loadFavoritesPage, 500);
  }
});
