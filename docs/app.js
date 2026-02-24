// PlutoSo (demo) — static, no backend. Data in localStorage.

const LS = {
  session: 'plutoso.session.v1',
  db: 'plutoso.db.v1',
};

const USERS = [
  { id: 'u1', name: 'Trung', avatar: '🪐', bio: 'Sếp tổng PlutoSo (demo).' },
  { id: 'u2', name: 'Quy', avatar: '🚀', bio: 'Thích làm sản phẩm nhanh & gọn.' },
  { id: 'u3', name: 'Linh', avatar: '🧠', bio: 'Hay soi edge-case.' },
  { id: 'u4', name: 'An', avatar: '🎨', bio: 'UI/UX là đam mê.' },
];

function nowTs() { return Date.now(); }
function fmtTime(ts) {
  const d = new Date(ts);
  return d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('toast--show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('toast--show'), 1400);
}

function loadSession() {
  try { return JSON.parse(localStorage.getItem(LS.session) || 'null'); } catch { return null; }
}
function saveSession(s) {
  localStorage.setItem(LS.session, JSON.stringify(s));
}

function defaultDb() {
  const seedPosts = [
    mkPost('p1', 'u2', 'Chào mừng đến PlutoSo! Đây là bản demo kiểu mạng xã hội (feed, like, comment).', nowTs() - 1000 * 60 * 60),
    mkPost('p2', 'u4', 'UI tối + gradient là chân ái. Nhưng nhớ responsive nhé.', nowTs() - 1000 * 60 * 35),
    mkPost('p3', 'u3', 'Gợi ý: mọi thứ lưu localStorage. Không backend nên đừng “đặt mật khẩu” thật nha.', nowTs() - 1000 * 60 * 10),
  ];

  return {
    posts: seedPosts,
    likes: {},     // postId -> Set(userId) serialized as array
    comments: {},  // postId -> [{id, userId, text, ts}]
    friends: {
      u1: ['u2','u3','u4'],
      u2: ['u1','u3'],
      u3: ['u1','u2'],
      u4: ['u1'],
    },
    messages: {
      // threadId: [{from,to,text,ts}]
      'u1-u2': [{ from:'u2', to:'u1', text:'Boss ơi, hôm nay deploy chưa?', ts: nowTs() - 1000*60*25 }],
      'u1-u4': [{ from:'u4', to:'u1', text:'Em có concept UI mới, xem không?', ts: nowTs() - 1000*60*50 }],
    }
  };
}

function loadDb() {
  try {
    const v = JSON.parse(localStorage.getItem(LS.db) || 'null');
    if (!v || typeof v !== 'object') throw 0;
    return v;
  } catch {
    const db = defaultDb();
    saveDb(db);
    return db;
  }
}
function saveDb(db) {
  localStorage.setItem(LS.db, JSON.stringify(db));
}

function mkPost(id, userId, text, ts) {
  return { id, userId, text, ts, media: null };
}

function uid(prefix='id') {
  return prefix + '_' + Math.random().toString(16).slice(2) + '_' + Date.now().toString(16);
}

function userById(id) {
  return USERS.find(u => u.id === id) || null;
}

function route() {
  const h = (location.hash || '#feed').replace('#','');
  const [name, arg] = h.split(':');
  return { name, arg };
}

function setRoute(name, arg='') {
  location.hash = arg ? `#${name}:${arg}` : `#${name}`;
}

function esc(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function mount(html) {
  document.getElementById('app').innerHTML = html;
}

function render() {
  const session = loadSession();
  if (!session || !session.userId) {
    renderLogin();
    return;
  }

  const me = userById(session.userId);
  const { name, arg } = route();

  renderShell(me, name);

  if (name === 'profile') {
    renderProfile(me, arg || me.id);
  } else if (name === 'friends') {
    renderFriends(me);
  } else if (name === 'messages') {
    renderMessages(me);
  } else {
    renderFeed(me);
  }
}

function renderLogin() {
  mount(`
    <div class="login">
      <div class="card loginCard">
        <div class="card__hd">
          <a class="brand" href="#">PlutoSo</a>
          <span class="muted">Demo mạng xã hội (static)</span>
        </div>
        <div class="card__bd">
          <h2 style="margin:0">Chọn tài khoản để đăng nhập</h2>
          <p class="muted" style="margin:8px 0 0">Không có mật khẩu. Dữ liệu lưu localStorage.</p>
          <div class="userGrid">
            ${USERS.map(u => `
              <button class="userBtn" type="button" data-user="${u.id}">
                <span class="avatar avatar--lg">${u.avatar}</span>
                <span>
                  <div style="font-weight:900">${esc(u.name)}</div>
                  <div class="muted" style="font-size:12px;line-height:1.3">${esc(u.bio)}</div>
                </span>
              </button>
            `).join('')}
          </div>
          <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:14px">
            <button id="resetDb" class="pill btn" type="button">Reset dữ liệu</button>
          </div>
        </div>
      </div>
    </div>
  `);

  document.querySelectorAll('[data-user]').forEach(btn => {
    btn.addEventListener('click', () => {
      saveSession({ userId: btn.dataset.user });
      toast('Đăng nhập thành công');
      setRoute('feed');
      render();
    });
  });

  document.getElementById('resetDb').addEventListener('click', () => {
    localStorage.removeItem(LS.db);
    toast('Đã reset dữ liệu');
  });
}

function renderShell(me, active) {
  const leftNav = `
    <div class="card left">
      <div class="card__hd">
        <div style="display:flex;gap:10px;align-items:center">
          <span class="avatar">${me.avatar}</span>
          <div>
            <div style="font-weight:900">${esc(me.name)}</div>
            <div class="muted" style="font-size:12px">${esc(me.bio)}</div>
          </div>
        </div>
        <button id="logout" class="pill btn" type="button">Logout</button>
      </div>
      <div class="card__bd">
        <nav class="nav">
          <a href="#feed" class="${active==='feed'?'active':''}">
            <span>📰 Bảng tin</span><span class="muted">#feed</span>
          </a>
          <a href="#profile" class="${active==='profile'?'active':''}">
            <span>🙍 Hồ sơ</span><span class="muted">#profile</span>
          </a>
          <a href="#friends" class="${active==='friends'?'active':''}">
            <span>👥 Bạn bè</span><span class="muted">#friends</span>
          </a>
          <a href="#messages" class="${active==='messages'?'active':''}">
            <span>💬 Tin nhắn</span><span class="muted">#messages</span>
          </a>
        </nav>
      </div>
    </div>
  `;

  const right = `
    <div class="card right">
      <div class="card__hd">
        <span style="font-weight:900">Gợi ý</span>
        <span class="muted">demo</span>
      </div>
      <div class="card__bd">
        <div class="rightList" id="rightList"></div>
      </div>
    </div>
  `;

  mount(`
    <header class="topbar">
      <div class="container topbar__row">
        <a class="brand" href="#feed">PlutoSo</a>
        <div class="search">
          <input id="search" placeholder="Tìm người / bài viết (demo)..." />
        </div>

        <a class="pill btn" href="#feed" title="Home">🏠</a>
        <a class="pill btn" href="#friends" title="Friends">👥</a>
        <a class="pill btn" href="#messages" title="Messages">💬</a>
        <button id="notifBtn" class="pill btn" type="button" title="Notifications">
          🔔 <span id="notifCount" class="badgeCount">3</span>
        </button>

        <a class="pill btn btn--primary" href="#profile:${me.id}" title="Profile">
          <span class="avatar">${me.avatar}</span>
          <span>${esc(me.name)}</span>
        </a>
      </div>
    </header>

    <main class="container">
      <section class="layout">
        ${leftNav}
        <div id="main"></div>
        ${right}
      </section>
    </main>
  `);

  document.getElementById('logout').addEventListener('click', () => {
    localStorage.removeItem(LS.session);
    toast('Đã logout');
    render();
  });

  // notifications (mock)
  const notifBtn = document.getElementById('notifBtn');
  if (notifBtn) {
    notifBtn.addEventListener('click', () => {
      toast('Demo: notifications sẽ làm ở phase tiếp theo');
    });
  }

  // right list suggestions
  const rightList = document.getElementById('rightList');
  if (rightList) {
    const others = USERS.filter(u => u.id !== me.id).slice(0, 4);
    rightList.innerHTML = others.map(u => `
      <div class="person" data-go="${u.id}">
        <span class="avatar">${u.avatar}</span>
        <span>
          <div class="person__name">${esc(u.name)}</div>
          <div class="person__sub">Xem profile</div>
        </span>
      </div>
    `).join('');
    rightList.querySelectorAll('[data-go]').forEach(el => {
      el.addEventListener('click', () => setRoute('profile', el.dataset.go));
    });
  }

  // search (very simple)
  const search = document.getElementById('search');
  search.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const q = search.value.trim().toLowerCase();
    if (!q) return;
    const u = USERS.find(x => x.name.toLowerCase().includes(q));
    if (u) {
      setRoute('profile', u.id);
      return;
    }
    toast('Demo: search chỉ tìm user theo tên');
  });

  // highlight nav for profile root
  const navProfile = document.querySelector('.nav a[href="#profile"]');
  if (active === 'profile' && location.hash.includes(':')) {
    navProfile.classList.add('active');
  }
}

function renderFeed(me) {
  const db = loadDb();
  const main = document.getElementById('main');

  main.innerHTML = `
    <div class="stories" id="stories" aria-label="Stories"></div>

    <div class="card">
      <div class="card__hd">
        <span style="font-weight:900">Bảng tin</span>
        <span class="muted">PlutoSo feed (demo)</span>
      </div>
      <div class="card__bd composer">
        <textarea id="postText" placeholder="Bạn đang nghĩ gì?"></textarea>
        <div class="composer__row">
          <span class="muted">Tip: data lưu localStorage</span>
          <div style="display:flex;gap:10px;align-items:center">
            <button id="photoBtn" class="pill btn" type="button">📷 Ảnh (demo)</button>
            <button id="postBtn" class="pill btn btn--primary" type="button">Đăng</button>
          </div>
        </div>
      </div>
    </div>

    <div class="feed" id="feed"></div>
  `;

  // stories row
  renderStories(me);

  let attachPhoto = false;
  document.getElementById('photoBtn').addEventListener('click', () => {
    attachPhoto = !attachPhoto;
    toast(attachPhoto ? 'Đã gắn ảnh (demo)' : 'Đã bỏ ảnh');
  });

  document.getElementById('postBtn').addEventListener('click', () => {
    const t = document.getElementById('postText').value.trim();
    if (!t) return toast('Nhập nội dung trước');
    const post = mkPost(uid('p'), me.id, t, nowTs());
    // phase 1: media placeholder flag
    if (attachPhoto) post.media = { kind: 'photo', emoji: '🖼️' };
    db.posts.unshift(post);
    saveDb(db);
    document.getElementById('postText').value = '';
    attachPhoto = false;
    toast('Đã đăng');
    drawFeed(me);
  });

  drawFeed(me);
}

function renderStories(me) {
  const el = document.getElementById('stories');
  if (!el) return;

  const people = [me, ...USERS.filter(u => u.id !== me.id)];
  el.innerHTML = people.map(u => `
    <button class="story" type="button" data-story="${u.id}">
      <div class="story__cover"></div>
      <div class="story__avatar"><span class="avatar">${u.avatar}</span></div>
      <div class="story__name">${esc(u.name)}</div>
    </button>
  `).join('');

  el.querySelectorAll('[data-story]').forEach(btn => {
    btn.addEventListener('click', () => {
      toast('Demo: story viewer sẽ làm ở phase sau');
    });
  });
}

function getLikes(db, postId) {
  const arr = db.likes[postId] || [];
  return new Set(arr);
}
function setLikes(db, postId, set) {
  db.likes[postId] = [...set];
}

function drawFeed(me) {
  const db = loadDb();
  const feed = document.getElementById('feed');
  const posts = db.posts.slice(0, 50);

  feed.innerHTML = posts.map(p => renderPostHtml(me, db, p)).join('');

  feed.querySelectorAll('[data-like]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.like;
      const likes = getLikes(db, id);
      if (likes.has(me.id)) likes.delete(me.id);
      else likes.add(me.id);
      setLikes(db, id, likes);
      saveDb(db);
      drawFeed(me);
    });
  });

  feed.querySelectorAll('[data-open]').forEach(el => {
    el.addEventListener('click', () => setRoute('profile', el.dataset.open));
  });

  feed.querySelectorAll('[data-add-comment]').forEach(btn => {
    btn.addEventListener('click', () => {
      const postId = btn.dataset.addComment;
      const input = feed.querySelector(`[data-comment-input="${postId}"]`);
      const text = input.value.trim();
      if (!text) return;
      db.comments[postId] = db.comments[postId] || [];
      db.comments[postId].push({ id: uid('c'), userId: me.id, text, ts: nowTs() });
      saveDb(db);
      drawFeed(me);
    });
  });
}

function renderPostHtml(me, db, p) {
  const u = userById(p.userId);
  const likes = getLikes(db, p.id);
  const comments = (db.comments[p.id] || []);
  const liked = likes.has(me.id);

  const media = p.media || autoMediaForPost(p);

  return `
    <article class="card post">
      <div class="post__top">
        <span class="avatar">${u?.avatar || '🙂'}</span>
        <div style="flex:1">
          <div class="post__name"><a href="javascript:void(0)" data-open="${p.userId}">${esc(u?.name || 'Unknown')}</a></div>
          <div class="post__time">${fmtTime(p.ts)}</div>
        </div>
        <span class="tag">${liked ? 'Đã like' : 'Bài viết'}</span>
      </div>
      <p class="post__text">${esc(p.text)}</p>

      ${media ? `<div class="post__media" aria-hidden="true"><span class="post__mediaEmoji">${media.emoji}</span></div>` : ''}

      <div class="post__actions">
        <button class="pill btn ${liked ? 'btn--primary' : ''}" type="button" data-like="${p.id}">👍 Like (${likes.size})</button>
        <span class="pill">💬 Comment (${comments.length})</span>
        <span class="pill">🔁 Share (demo)</span>
      </div>

      <div class="comments">
        ${comments.slice(-3).map(c => {
          const cu = userById(c.userId);
          return `
            <div class="comment">
              <span class="avatar">${cu?.avatar || '🙂'}</span>
              <div class="comment__bubble">
                <div><strong>${esc(cu?.name || 'Unknown')}</strong> ${esc(c.text)}</div>
                <div class="comment__meta">${fmtTime(c.ts)}</div>
              </div>
            </div>
          `;
        }).join('')}

        <div class="inputRow">
          <input data-comment-input="${p.id}" placeholder="Viết bình luận..." />
          <button class="pill btn" type="button" data-add-comment="${p.id}">Gửi</button>
        </div>
      </div>
    </article>
  `;
}

function autoMediaForPost(p) {
  // phase 1: sprinkle a few media blocks for "Facebook feel"
  const last = p.id?.charCodeAt(p.id.length - 1) || 0;
  if (last % 4 !== 0) return null;
  const emoji = ['🖼️','🌆','🎉','📸'][last % 4];
  return { kind: 'photo', emoji };
}

function renderProfile(me, userId) {
  const db = loadDb();
  const u = userById(userId);
  const main = document.getElementById('main');

  if (!u) {
    main.innerHTML = `<div class="card"><div class="card__bd">Không tìm thấy user.</div></div>`;
    return;
  }

  const my = u.id === me.id;
  const friends = (db.friends[u.id] || []).map(userById).filter(Boolean);
  const posts = db.posts.filter(p => p.userId === u.id);

  main.innerHTML = `
    <div class="card profile">
      <div class="profile__cover"></div>
      <div class="profile__header">
        <span class="avatar avatar--xl">${u.avatar}</span>
        <div class="profile__meta">
          <div class="profile__name">${esc(u.name)}</div>
          <div class="muted">${esc(u.bio)}</div>
          <div class="profile__stats">
            <span class="pill">👥 Bạn bè: <strong>${friends.length}</strong></span>
            <span class="pill">📝 Bài viết: <strong>${posts.length}</strong></span>
            <span class="pill">✅ Xác minh: demo</span>
          </div>
        </div>
        <div class="profile__actions">
          ${my ? `<span class="pill">Đây là bạn</span>` : `<button id="msgBtn" class="pill btn btn--primary" type="button">Nhắn tin</button>`}
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:12px">
      <div class="card__hd"><span style="font-weight:900">Bài viết</span><span class="muted">của ${esc(u.name)}</span></div>
      <div class="card__bd">
        <div class="feed" id="profileFeed"></div>
      </div>
    </div>
  `;

  const profileFeed = document.getElementById('profileFeed');
  profileFeed.innerHTML = posts.length ? posts.map(p => renderPostHtml(me, db, p)).join('') : `<p class="muted">Chưa có bài viết.</p>`;

  // wire interactions (reuse)
  profileFeed.querySelectorAll('[data-like]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.like;
      const likes = getLikes(db, id);
      if (likes.has(me.id)) likes.delete(me.id);
      else likes.add(me.id);
      setLikes(db, id, likes);
      saveDb(db);
      renderProfile(me, userId);
    });
  });
  profileFeed.querySelectorAll('[data-open]').forEach(el => {
    el.addEventListener('click', () => setRoute('profile', el.dataset.open));
  });
  profileFeed.querySelectorAll('[data-add-comment]').forEach(btn => {
    btn.addEventListener('click', () => {
      const postId = btn.dataset.addComment;
      const input = profileFeed.querySelector(`[data-comment-input="${postId}"]`);
      const text = input.value.trim();
      if (!text) return;
      db.comments[postId] = db.comments[postId] || [];
      db.comments[postId].push({ id: uid('c'), userId: me.id, text, ts: nowTs() });
      saveDb(db);
      renderProfile(me, userId);
    });
  });

  if (!my) {
    const msgBtn = document.getElementById('msgBtn');
    msgBtn.addEventListener('click', () => {
      setRoute('messages', userId);
    });
  }
}

function threadId(a, b) {
  return [a,b].sort().join('-');
}

function renderFriends(me) {
  const db = loadDb();
  const main = document.getElementById('main');
  const ids = db.friends[me.id] || [];
  const list = ids.map(userById).filter(Boolean);

  main.innerHTML = `
    <div class="card">
      <div class="card__hd"><span style="font-weight:900">Bạn bè</span><span class="muted">(${list.length})</span></div>
      <div class="card__bd">
        <div class="rightList">
          ${list.map(u => `
            <div class="person" data-go="${u.id}">
              <span class="avatar">${u.avatar}</span>
              <span>
                <div class="person__name">${esc(u.name)}</div>
                <div class="person__sub">Xem hồ sơ</div>
              </span>
              <span class="pill">💬</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  main.querySelectorAll('[data-go]').forEach(el => {
    el.addEventListener('click', () => setRoute('profile', el.dataset.go));
  });
}

function renderMessages(me) {
  const db = loadDb();
  const { arg } = route();
  const peerId = arg || (db.friends[me.id] || [])[0] || 'u2';
  const peer = userById(peerId) || USERS[1];
  const tId = threadId(me.id, peer.id);
  db.messages[tId] = db.messages[tId] || [];

  const main = document.getElementById('main');
  main.innerHTML = `
    <div class="card">
      <div class="card__hd">
        <div style="display:flex;gap:10px;align-items:center">
          <span class="avatar">${peer.avatar}</span>
          <div>
            <div style="font-weight:900">Chat với ${esc(peer.name)}</div>
            <div class="muted" style="font-size:12px">Mock messenger — không realtime</div>
          </div>
        </div>
        <button class="pill btn" type="button" id="goProfile">Xem hồ sơ</button>
      </div>
      <div class="card__bd">
        <div id="chat" class="rightList" style="gap:8px"></div>
        <div class="inputRow" style="margin-top:12px">
          <input id="msg" placeholder="Nhập tin nhắn..." />
          <button id="send" class="pill btn btn--primary" type="button">Gửi</button>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:12px">
      <div class="card__hd"><span style="font-weight:900">Chuyển hội thoại</span><span class="muted">demo</span></div>
      <div class="card__bd">
        <div class="rightList">
          ${USERS.filter(u=>u.id!==me.id).map(u=>`
            <div class="person" data-peer="${u.id}">
              <span class="avatar">${u.avatar}</span>
              <span>
                <div class="person__name">${esc(u.name)}</div>
                <div class="person__sub">Mở chat</div>
              </span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  document.getElementById('goProfile').addEventListener('click', () => setRoute('profile', peer.id));

  main.querySelectorAll('[data-peer]').forEach(el => {
    el.addEventListener('click', () => setRoute('messages', el.dataset.peer));
  });

  function draw() {
    const msgs = db.messages[tId] || [];
    const chat = document.getElementById('chat');
    chat.innerHTML = msgs.map(m => {
      const from = userById(m.from);
      const mine = m.from === me.id;
      return `
        <div class="person" style="justify-content:space-between;gap:12px;${mine ? 'border-color:rgba(108,92,231,.35);background:rgba(108,92,231,.10)' : ''}">
          <span style="display:flex;gap:10px;align-items:center">
            <span class="avatar">${from?.avatar || '🙂'}</span>
            <span>
              <div class="person__name">${esc(from?.name || 'Unknown')}</div>
              <div class="person__sub">${esc(m.text)}</div>
            </span>
          </span>
          <span class="muted" style="font-size:12px">${fmtTime(m.ts)}</span>
        </div>
      `;
    }).join('') || `<p class="muted">Chưa có tin nhắn.</p>`;
  }

  draw();

  document.getElementById('send').addEventListener('click', () => {
    const input = document.getElementById('msg');
    const text = input.value.trim();
    if (!text) return;
    db.messages[tId].push({ from: me.id, to: peer.id, text, ts: nowTs() });
    saveDb(db);
    input.value = '';
    draw();
  });
}

// events
window.addEventListener('hashchange', render);

// init
render();
