import { signIn } from './auth.js';
import { graphqlRequest } from './graphql.js';
import {
  formatXP,
  renderXPGraph,
  renderPassFailGraph,
  renderXPByProjectGraph,
} from './graph.js';

const loginView    = document.getElementById('login-view');
const profileView  = document.getElementById('profile-view');
const loginForm    = document.getElementById('login-form');
const loginError   = document.getElementById('login-error');
const profileErr   = document.getElementById('profile-error');
const profileLoad  = document.getElementById('profile-loading');
const logoutBtn    = document.getElementById('logout-btn');
const whoLogin     = document.getElementById('who-login');
const statXP       = document.getElementById('stat-xp');
const statAudit    = document.getElementById('stat-audit');
const statId       = document.getElementById('stat-id');
const activityList = document.getElementById('activity-list');
const consoleQuery = document.getElementById('console-query');
const consoleRun   = document.getElementById('console-run');
const consoleOut   = document.getElementById('console-result');

function showLoginView() {
  loginView.hidden = false;
  profileView.hidden = true;
}
function showProfileView() {
  loginView.hidden = true;
  profileView.hidden = false;
}

function renderActivity(rows) {
  activityList.replaceChildren();

  if (!rows.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'Nothing recorded yet.';
    activityList.append(li);
    return;
  }
  rows.forEach((r) => {
    const name = document.createElement('span');
    name.className = 'activity-name';
    name.textContent = (r.path || '').split('/').filter(Boolean).pop() || 'unknown';

    const grade = document.createElement('span');
    grade.className = 'activity-grade ' + (r.grade >= 1 ? 'pass' : 'fail');
    grade.textContent = r.grade >= 1 ? 'Passed' : 'Failed';

    const date = document.createElement('span');
    date.className = 'activity-date';
    date.textContent = new Date(r.createdAt).toLocaleDateString();

    const li = document.createElement('li');
    li.append(name, grade, date);
    activityList.append(li);
  });
}

async function loadProfile() {
  profileErr.hidden = true;
  profileLoad.hidden = false;

  try {
    // Normal query
    const basic = await graphqlRequest(`
      query {
        user {
          id
          login
        }
      }
    `);
    const me = basic.user[0];
    whoLogin.textContent = me.login;
    statId.textContent = me.id;

    // Query with arguments
    const xpData = await graphqlRequest(
      `
      query XP($type: String!) {
        transaction(
          where: {
            type: { _eq: $type }
            event: { path: { _eq: "/bahrain/bh-module" } }
          }
        ) {
          amount
          path
          createdAt
        }
      }
    `,
      { type: 'xp' }
    );
    const xpTx = xpData.transaction;
    const totalXP = xpTx.reduce((sum, t) => sum + t.amount, 0);
    statXP.textContent = formatXP(totalXP);
    renderXPGraph(xpTx);
    renderXPByProjectGraph(xpTx);

    const auditData = await graphqlRequest(`
      query {
        transaction(where: { type: { _in: ["up", "down"] } }) {
          type
          amount
        }
      }
    `);
    const up = auditData.transaction
      .filter((t) => t.type === 'up')
      .reduce((s, t) => s + t.amount, 0);
    const down = auditData.transaction
      .filter((t) => t.type === 'down')
      .reduce((s, t) => s + t.amount, 0);
    statAudit.textContent = down > 0 ? (up / down).toFixed(2) : 'N/A';

    const progressData = await graphqlRequest(`
      query {
        progress(where: { grade: { _is_null: false }, object: { type: { _eq: "project" } } }) {
          id
          grade
        }
      }
    `);
    renderPassFailGraph(progressData.progress);
    // Nested query — also feeds the activity list
    const nested = await graphqlRequest(`
      query {
        result(limit: 8, order_by: { createdAt: desc }) {
          id
          grade
          path
          createdAt
          user {
            login
          }
        }
      }
    `);
    renderActivity(nested.result);

    profileLoad.hidden = true;
  } catch (err) {
    profileLoad.hidden = true;
    profileErr.textContent = err.message;
    profileErr.hidden = false;
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.hidden = true;

  const identifier = document.getElementById('identifier').value.trim();
  const password = document.getElementById('password').value;

  try {
    const token = await signIn(identifier, password);
    localStorage.setItem('jwt', token);
    showProfileView();
    await loadProfile();
  } catch (err) {
    loginError.textContent = err.message || 'Invalid username/email or password.';
    loginError.hidden = false;
  }
});

consoleRun.addEventListener('click', async () => {
  consoleOut.textContent = 'Running…';
  try {
    const data = await graphqlRequest(consoleQuery.value);
    consoleOut.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    consoleOut.textContent = 'Error: ' + err.message;
  }
});

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('jwt');
  showLoginView();
});

if (localStorage.getItem('jwt')) {
  showProfileView();
  loadProfile();
}
