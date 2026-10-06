/**
 * Sign-in screen — modelled on the real Portside login (Keycloak realm `portside`,
 * custom theme `portside_v3`): a white left panel with the centred form and the brand blue
 * button, and a full-bleed visual panel on the right.
 *
 * Deliberately illustrative: no credentials are validated and nothing is sent anywhere.
 * The real page posts to Keycloak's authorization endpoint with PKCE.
 */
import { h, field, btn, icon, alert, toast } from '../ui.js';

export function login() {
  const go = () => {
    sessionStorage.setItem('portside.session', '1');
    location.hash = '#/deals';
  };
  const form = h('form', { class:'login-form', onSubmit: e => { e.preventDefault(); go(); } },
    h('h1', { class:'login-title' }, 'Sign in'),
    h('div', { class:'ui form' },
      field('Email', h('input', { type:'email', placeholder:'', autocomplete:'username', value:'elena.marchetti@meridian-logistics.example' })),
      h('div', { class:'login-pw', id:'pw-row' },
        field('Password', h('input', { type:'password', placeholder:'', autocomplete:'current-password', value:'demo' }))),
    ),
    h('button', { class:'ui fluid primary button login-submit', type:'submit' }, 'Sign In'),
    h('a', { class:'login-alt', href:'#', onClick: e => {
        e.preventDefault();
        const row = document.getElementById('pw-row');
        const on = row.style.display !== 'none';
        row.style.display = on ? 'none' : '';
        if (on) toast('Passwordless sign-in would email a magic link (mock)', 'good');
      } }, 'Login with a password'),
  );

  const legal = h('div', { class:'login-legal' },
    'By continuing, you are agreeing to our ',
    h('a', { href:'#', onClick:e => e.preventDefault() }, 'Terms of Use'), ', ',
    h('a', { href:'#', onClick:e => e.preventDefault() }, 'Privacy policy'), ' and ',
    h('a', { href:'#', onClick:e => e.preventDefault() }, 'Cookies policy'), '.');

  return h('div', { class:'login-page' },
    h('div', { class:'login-left' },
      h('div', { class:'login-brand' },
        h('div', { class:'brand-logo' }, 'B'),
        h('div', { class:'brand-name' }, 'Portside')),
      h('div', { class:'login-center' }, form),
      legal),
    h('div', { class:'login-right' },
      h('div', { class:'login-visual' },
        h('div', { class:'login-visual-inner' },
          icon('ship', 74),
          h('div', { class:'login-visual-cap' }, 'Container shipping execution'),
          h('div', { class:'login-visual-sub' },
            'Bookings · shipping instructions · B/L · VGM · customs · tracking')))));
}
