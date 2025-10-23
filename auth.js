(function(){
  class Auth {
    constructor(){
      this.modal = document.getElementById('auth-modal');
      this.loginForm = document.getElementById('login-form');
      this.registerForm = document.getElementById('register-form');
      this.loginUsername = document.getElementById('login-username');
      this.loginPassword = document.getElementById('login-password');
      this.registerUsername = document.getElementById('register-username');
      this.registerPassword = document.getElementById('register-password');
      this.btnClose = document.getElementById('auth-close');
      this.tabButtons = document.querySelectorAll('.tab-btn');
      this.btnLogin = document.getElementById('btn-login');
      this.btnRegister = document.getElementById('btn-register');
      this.btnLogout = document.getElementById('btn-logout');
      this.userLabel = document.getElementById('current-user-label');

      this._bindEvents();
      this._updateHeader();
    }

    _bindEvents(){
      // Abrir modal
      this.btnLogin?.addEventListener('click', ()=> this.open('login'));
      this.btnRegister?.addEventListener('click', ()=> this.open('register'));
      // Cerrar modal
      this.btnClose?.addEventListener('click', ()=> this.close());

      // Tabs
      this.tabButtons.forEach(btn => {
        btn.addEventListener('click', ()=>{
          this.tabButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const tab = btn.dataset.tab;
          this._showTab(tab);
        });
      });

      // Login
      this.loginForm?.addEventListener('submit', async (e)=>{
        e.preventDefault();
        const user = this.loginUsername.value.trim();
        const pass = this.loginPassword.value.trim();
        if(!user || !pass){ this._notify('Completa usuario y contraseña', 'error'); return; }
        const ok = await this.login(user, pass);
        if(ok){
          this._notify('Inicio de sesión correcto', 'success');
          this.close();
        } else {
          this._notify('Usuario o contraseña incorrectos', 'error');
        }
      });

      // Registro
      this.registerForm?.addEventListener('submit', async (e)=>{
        e.preventDefault();
        const user = this.registerUsername.value.trim();
        const pass = this.registerPassword.value.trim();
        if(!user || !pass){ this._notify('Completa usuario y contraseña', 'error'); return; }
        const ok = await this.register(user, pass);
        if(ok){
          this._notify('Cuenta creada. Ya puedes iniciar sesión', 'success');
          this._showTab('login');
        } else {
          this._notify('El usuario ya existe', 'error');
        }
      });

      // Logout
      this.btnLogout?.addEventListener('click', ()=>{
        this.logout();
        this._notify('Sesión cerrada', 'success');
      });
    }

    open(tab){
      this.modal?.classList.remove('hidden');
      this._showTab(tab || 'login');
    }
    close(){
      this.modal?.classList.add('hidden');
    }

    _showTab(tab){
      if(tab === 'login'){
        this.loginForm?.classList.remove('hidden');
        this.registerForm?.classList.add('hidden');
        document.getElementById('auth-title').textContent = 'Iniciar sesión';
      } else {
        this.loginForm?.classList.add('hidden');
        this.registerForm?.classList.remove('hidden');
        document.getElementById('auth-title').textContent = 'Registrarse';
      }
    }

    async register(email, password){
      const cfg = window.APP_CONFIG || {};
      if (cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase) {
        try {
          const client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
          const { error } = await client.auth.signUp({
            email,
            password,
            options: { data: { username: email } },
          });
          if (error) { console.warn(error); return false; }
          window.analytics?.track('user_registered', { username: email });
          return true;
        } catch (e) {
          console.warn('Supabase signUp error:', e);
        }
      }
      // Fallback local
      const users = this._getUsers();
      if(users.find(u => u.username.toLowerCase() === email.toLowerCase())){
        return false;
      }
      const hash = await this._hash(password);
      users.push({ username: email, hash });
      localStorage.setItem('users', JSON.stringify(users));
      window.analytics?.track('user_registered', { username: email });
      return true;
    }

    async login(email, password){
      const cfg = window.APP_CONFIG || {};
      if (cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase) {
        try {
          const client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
          const { data, error } = await client.auth.signInWithPassword({ email, password });
          if (error) { console.warn(error); return false; }

          // Registrar/actualizar perfil del usuario en la BD
          try {
            const { data: userData } = await client.auth.getUser();
            const authedUser = userData?.user;
            if (authedUser?.id) {
              await client.from('profiles').upsert({
                user_id: authedUser.id,
                email: email,
              }, { onConflict: 'user_id' });
            }
          } catch (e) {
            console.warn('Supabase upsert profile error:', e);
          }

          const label = email;
          localStorage.setItem('currentUser', label);
          this._updateHeader();
          window.dispatchEvent(new CustomEvent('auth:login', { detail: { username: label } }));
          window.analytics?.track('user_logged_in', { username: label });
          return true;
        } catch (e) {
          console.warn('Supabase signIn error:', e);
        }
      }
      // Fallback local
      const users = this._getUsers();
      const user = users.find(u => u.username.toLowerCase() === email.toLowerCase());
      if(!user) return false;
      const hash = await this._hash(password);
      if(hash !== user.hash) return false;
      localStorage.setItem('currentUser', email);
      this._updateHeader();
      window.dispatchEvent(new CustomEvent('auth:login', { detail: { username: email } }));
      window.analytics?.track('user_logged_in', { username: email });
      return true;
    }

    async logout(){
      const cfg = window.APP_CONFIG || {};
      if (cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase) {
        try {
          const client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
          await client.auth.signOut();
        } catch (e) {
          console.warn('Supabase signOut error:', e);
        }
      }
      const username = this.getCurrentUser();
      localStorage.removeItem('currentUser');
      this._updateHeader();
      window.dispatchEvent(new CustomEvent('auth:logout', { detail: { username } }));
      window.analytics?.track('user_logged_out', { username });
    }

    getCurrentUser(){
      return localStorage.getItem('currentUser') || null;
    }

    _getUsers(){
      try { return JSON.parse(localStorage.getItem('users')) || []; }
      catch { return []; }
    }

    async _hash(str){
      if(window.crypto?.subtle){
        const enc = new TextEncoder().encode(str);
        const digest = await crypto.subtle.digest('SHA-256', enc);
        return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
      }
      // Fallback simple si no hay SubtleCrypto (no seguro en producción)
      let h = 0; for(let i=0;i<str.length;i++){ h = ((h<<5)-h)+str.charCodeAt(i); h|=0; }
      return h.toString();
    }

    _updateHeader(){
      const user = this.getCurrentUser();
      if(user){
        this.userLabel.textContent = `Sesión: ${user}`;
        this.btnLogin.style.display = 'none';
        this.btnRegister.style.display = 'none';
        this.btnLogout.style.display = 'inline-flex';
      } else {
        this.userLabel.textContent = 'Invitado';
        this.btnLogin.style.display = 'inline-flex';
        this.btnRegister.style.display = 'inline-flex';
        this.btnLogout.style.display = 'none';
      }
    }

    _notify(message, type='info'){
      if(window.app?.showNotification){
        window.app.showNotification(message, type);
      } else {
        console.log(`[${type}]`, message);
      }
    }
  }

  window.Auth = Auth;
  window.auth = new Auth();
})();