import { auth, onAuthStateChanged } from './firebase.js';

const path = window.location.pathname.toLowerCase();
const isAuthPage = path.includes('signin') || path.includes('signup');

// Extra layer of protection for BFCache (Browser Back/Forward)
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    document.body.style.display = 'none';
    window.location.reload();
  }
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    if (isAuthPage) {
      window.location.replace('./index.html');
    } else {
      const style = document.getElementById('auth-guard-style');
      if (style) style.remove();
      document.body.style.display = '';
    }
  } else {
    if (!isAuthPage) {
      try {
        localStorage.removeItem('rankhub_user');
      } catch (e) {}
      window.location.replace('./signin.html');
    } else {
      const style = document.getElementById('auth-guard-style');
      if (style) style.remove();
      document.body.style.display = '';
    }
  }
});
