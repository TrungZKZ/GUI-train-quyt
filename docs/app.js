// PlutoSo (demo) — static, no backend. Data in localStorage.

const LS = {
  session: 'plutoso.session.v1',
  db: 'plutoso.db.v1',
  storiesSeen: 'plutoso.storiesSeen.v1'
};

// --- Supabase (public) ---
// IMPORTANT: use only ANON/PUBLISHABLE key in frontend.
const SUPABASE_PROJECT_ID = 'cvjhfjadnczqrkpvzetl';
const SUPABASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co`;
// Provided by user (publishable/anon). Safe to embed.
const SUPABASE_ANON_KEY = 'sb_publishable_eedGdwphvFDrfIewRPMZgw_qwTql4PX';

const supabase = (window.supabase && window.supabase.createClient)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

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

function loadSeenStories() {
  try {
    const v = JSON.parse(localStorage.getItem(LS.storiesSeen) || '[]');
    return Array.isArray(v) ? new Set(v) : new Set();
  } catch {
    return new Set();
  }
}
function saveSeenStories(set) {
  localStorage.setItem(LS.storiesSeen, JSON.stringify([...set]));
}

function loadSession() {
  try { return JSON.parse(localStorage.getItem(LS.session) || 'null'); } catch { return null; }
}
function saveSession(s) {
  localStorage.setItem(LS.session, JSON.stringify(s));
}

async function getAuthUser() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user || null;
}

function userLabelFromEmail(email) {
  if (!email) return 'User';
  const at = email.indexOf('@');
  const base = (at > 0 ? email.slice(0, at) : email).slice(0, 24);
  return base || 'User';
}

function defaultDb() {
  const seedPosts = [
    mkPost('p1', 'u2', 'Chào mừng đến PlutoSo! Đây là bản demo kiểu mạng xã hội (feed, like, comment).', nowTs() - 1000 * 60 * 60),
    mkPost('p2', 'u4', 'UI tối + gradient là chân ái. Nhưng nhớ responsive nhé.', nowTs() - 1000 * 60 * 35),
    mkPost('p3', 'u3', 'Gợi ý: mọi thứ lưu localStorage. Không backend nên đừng “đặt mật khẩu” thật nha.', nowTs() - 1000 * 60 * 10),
  ];

  return {
    posts: seedPosts,
    likes: {},     // legacy: postId -> Set(userId) serialized as array
    reactions: {}, // postId -> { userId: reaction }
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

    // migrations / defaults
    if (!v.reactions) v.reactions = {};
    if (!v.likes) v.likes = {};
    if (!v.comments) v.comments = {};
    if (!v.friends) v.friends = {};
    if (!v.messages) v.messages = {};

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

async function render() {
  // Prefer Supabase auth session when available.
  if (supabase) {
    const user = await getAuthUser();
    if (!user) {
      renderLoginSupabase();
      return;
    }
    const me = {
      id: user.id,
      name: user.user_metadata?.name || userLabelFromEmail(user.email),
      avatar: (user.user_metadata?.avatar || '🪐'),
      bio: 'PlutoSo user',
      email: user.email,
      __supabase: true,
    };

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
    return;
  }

  // Fallback: local mock login
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

function renderLoginSupabase() {
  mount(`
    <div class="login">
      <div class="card loginCard">
        <div class="card__hd">
          <a class="brand" href="#">PlutoSo</a>
          <span class="muted">Đăng nhập thật (Supabase)</span>
        </div>
        <div class="card__bd">
          <h2 style="margin:0">Đăng nhập</h2>
          <p class="muted" style="margin:8px 0 0">Email/password. (Backend: Supabase)</p>

          <div style="display:grid;gap:10px;margin-top:12px">
            <input id="authEmail" class="storyReply" placeholder="email@domain.com" />
            <input id="authPass" class="storyReply" type="password" placeholder="password" />
            <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap">
              <button id="authSignup" class="pill btn" type="button">Sign up</button>
              <button id="authLogin" class="pill btn btn--primary" type="button">Login</button>
            </div>
            <p class="muted" style="font-size:12px;margin:6px 0 0">Nếu bật Email confirmation trong Supabase thì account mới sẽ cần confirm email.</p>
          </div>
        </div>
      </div>
    </div>
  `);

  const emailEl = document.getElementById('authEmail');
  const passEl = document.getElementById('authPass');

  document.getElementById('authLogin').addEventListener('click', async () => {
    const email = emailEl.value.trim();
    const password = passEl.value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return toast('Login lỗi: ' + error.message);
    toast('Login OK');
    render();
  });

  document.getElementById('authSignup').addEventListener('click', async () => {
    const email = emailEl.value.trim();
    const password = passEl.value;
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return toast('Signup lỗi: ' + error.message);
    toast('Signup OK (có thể cần confirm email)');
  });
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

  // Upload from device (Supabase) OR fallback demo emoji
  const filePicker = document.createElement('input');
  filePicker.type = 'file';
  filePicker.accept = 'image/*,video/*';
  filePicker.style.display = 'none';
  document.body.appendChild(filePicker);

  let pendingFile = null;
  document.getElementById('photoBtn').addEventListener('click', () => {
    if (!supabase) {
      pendingFile = pendingFile ? null : { kind: 'photo', emoji: '🖼️' };
      toast(pendingFile ? 'Đã gắn ảnh (demo)' : 'Đã bỏ ảnh');
      return;
    }
    filePicker.value = '';
    filePicker.click();
  });

  filePicker.addEventListener('change', () => {
    const f = filePicker.files && filePicker.files[0];
    if (!f) return;
    pendingFile = f;
    toast(`Đã chọn file: ${f.name}`);
  });

  document.getElementById('postBtn').addEventListener('click', async () => {
    const t = document.getElementById('postText').value.trim();
    if (!t) return toast('Nhập nội dung trước');

    // Local fallback: old behavior
    if (!supabase) {
      const post = mkPost(uid('p'), me.id, t, nowTs());
      if (pendingFile && pendingFile.kind) post.media = pendingFile;
      db.posts.unshift(post);
      saveDb(db);
      document.getElementById('postText').value = '';
      pendingFile = null;
      toast('Đã đăng');
      drawFeed(me);
      return;
    }

    // Supabase-backed post + optional media upload
    try {
      let mediaUrl = null;
      let mediaType = null;
      let mediaMeta = null;

      if (pendingFile && pendingFile instanceof File) {
        const user = await getAuthUser();
        if (!user) throw new Error('Not logged in');

        const ext = (pendingFile.name.split('.').pop() || 'bin').toLowerCase();
        const path = `${user.id}/${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`;

        const bucket = 'media';
        const { error: upErr } = await supabase.storage.from(bucket).upload(path, pendingFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: pendingFile.type || undefined,
        });
        if (upErr) throw upErr;

        mediaType = pendingFile.type.startsWith('video/') ? 'video' : 'image';
        mediaMeta = { bucket, path, type: mediaType, name: pendingFile.name };
      }

      // Insert post
      const authUser = await getAuthUser();
      const { data: ins, error: insErr } = await supabase
        .from('posts')
        .insert({ user_id: authUser.id, display_name: me.name, text: t })
        .select('id, user_id, text, created_at, display_name')
        .single();
      if (insErr) throw insErr;

      if (mediaMeta) {
        const { error: mErr } = await supabase
          .from('post_media')
          .insert({ post_id: ins.id, bucket: mediaMeta.bucket, path: mediaMeta.path, media_type: mediaMeta.type, file_name: mediaMeta.name });
        if (mErr) throw mErr;
      }

      document.getElementById('postText').value = '';
      pendingFile = null;
      toast('Đã đăng (server)');
      await drawFeedFromServer(me);
    } catch (e) {
      toast('Post/upload lỗi: ' + (e?.message || String(e)));
    }
  });

  // Skeleton loading (UI feel)
  const feed = document.getElementById('feed');
  if (feed) {
    feed.innerHTML = Array.from({ length: 4 }).map(() => `
      <div class="card post skeleton">
        <div class="skeleton__row"></div>
        <div class="skeleton__line"></div>
        <div class="skeleton__line"></div>
        <div class="skeleton__media"></div>
      </div>
    `).join('');
  }

  setTimeout(() => {
    if (supabase) drawFeedFromServer(me);
    else drawFeed(me);
  }, 180);
}

function renderStories(me) {
  const el = document.getElementById('stories');
  if (!el) return;

  const seen = loadSeenStories();
  const people = [me, ...USERS.filter(u => u.id !== me.id)];

  el.innerHTML = people.map(u => {
    const isSeen = seen.has(u.id);
    return `
      <button class="story ${isSeen ? 'story--seen' : ''}" type="button" data-story="${u.id}">
        <div class="story__cover"></div>
        <div class="story__avatar"><span class="avatar">${u.avatar}</span></div>
        <div class="story__name">${esc(u.name)}</div>
      </button>
    `;
  }).join('');

  el.querySelectorAll('[data-story]').forEach(btn => {
    btn.addEventListener('click', () => {
      openStoryViewer(me, btn.dataset.story);
    });
  });
}

const REACTIONS = [
  { id: 'like', emoji: '👍', label: 'Like' },
  { id: 'love', emoji: '❤️', label: 'Love' },
  { id: 'haha', emoji: '😂', label: 'Haha' },
  { id: 'wow', emoji: '😮', label: 'Wow' },
  { id: 'sad', emoji: '😢', label: 'Sad' },
  { id: 'angry', emoji: '😡', label: 'Angry' },
];

function getLikes(db, postId) {
  // legacy set (kept for backward compatibility; not used for rendering anymore)
  const arr = db.likes[postId] || [];
  return new Set(arr);
}
function setLikes(db, postId, set) {
  db.likes[postId] = [...set];
}

function getReactions(db, postId) {
  return db.reactions[postId] || {};
}
function setReaction(db, postId, userId, reactionId) {
  db.reactions[postId] = db.reactions[postId] || {};
  if (!reactionId) {
    delete db.reactions[postId][userId];
    return;
  }
  db.reactions[postId][userId] = reactionId;
}
function myReaction(db, postId, userId) {
  return getReactions(db, postId)[userId] || null;
}
function reactionCounts(db, postId) {
  const map = getReactions(db, postId);
  const counts = {};
  for (const r of Object.values(map)) {
    counts[r] = (counts[r] || 0) + 1;
  }
  return counts;
}
function topReactions(db, postId) {
  const counts = reactionCounts(db, postId);
  const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  return sorted.slice(0, 3).map(([id]) => REACTIONS.find(r=>r.id===id)?.emoji).filter(Boolean);
}

async function drawFeedFromServer(me) {
  if (!supabase) return;

  const feed = document.getElementById('feed');
  if (!feed) return;

  // Fetch latest posts (public)
  const { data: posts, error: pErr } = await supabase
    .from('posts')
    .select('id,user_id,display_name,text,created_at')
    .order('created_at', { ascending: false })
    .limit(30);

  if (pErr) {
    toast('Fetch posts lỗi: ' + pErr.message);
    return;
  }

  const postIds = (posts || []).map(p => p.id);

  let media = [];
  if (postIds.length) {
    const { data: m, error: mErr } = await supabase
      .from('post_media')
      .select('post_id,bucket,path,media_type,file_name')
      .in('post_id', postIds);
    if (!mErr) media = m || [];
  }

  // Sign URLs (public edge function)
  const items = media.map(m => ({ bucket: m.bucket, path: m.path }));
  const signedMap = new Map();
  if (items.length) {
    const { data, error } = await supabase.functions.invoke('sign-media', {
      body: { items, expiresIn: 300 }
    });
    if (!error && data?.items) {
      for (const it of data.items) {
        signedMap.set(`${it.bucket}::${it.path}`, it.signedUrl);
      }
    }
  }

  // Build a local-db-like view for rendering (reuse existing UI)
  const db = loadDb();
  const serverPosts = (posts || []).map(p => {
    const uName = p.display_name || ('User ' + String(p.user_id).slice(0, 6));
    const anyMedia = media.find(m => m.post_id === p.id);
    let mediaObj = null;
    if (anyMedia) {
      const url = signedMap.get(`${anyMedia.bucket}::${anyMedia.path}`);
      if (url) {
        mediaObj = { kind: anyMedia.media_type, url };
      }
    }
    return { id: 'srv_' + p.id, userId: p.user_id, text: p.text, ts: new Date(p.created_at).getTime(), media: mediaObj, __display: uName };
  });

  // Render
  feed.innerHTML = serverPosts.map(p => {
    // patch a tiny user mapping for server users
    const u = { id: p.userId, name: p.__display, avatar: '🪐' };
    // create a throwaway rendering db
    const tempDb = { ...db, posts: [p] };
    return renderPostHtml(me, tempDb, { ...p, userId: p.userId, ts: p.ts, media: p.media });
  }).join('');

  wireFeedHandlers(me, db);
}

function drawFeed(me) {
  const db = loadDb();
  const feed = document.getElementById('feed');
  const posts = db.posts.slice(0, 50);

  feed.innerHTML = posts.map(p => renderPostHtml(me, db, p)).join('');

  wireFeedHandlers(me, db);
}

function wireFeedHandlers(me, db) {
  const feed = document.getElementById('feed');
  if (!feed) return;

  // Defensive: ensure popovers are hidden by default after re-render.
  feed.querySelectorAll('[data-menu-pop]').forEach(x => x.setAttribute('hidden', ''));
  feed.querySelectorAll('[data-react-pop]').forEach(x => x.setAttribute('hidden', ''));

  // post menus
  feed.querySelectorAll('[data-menu]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const postId = btn.dataset.menu;
      const pop = feed.querySelector(`[data-menu-pop="${postId}"]`);
      if (!pop) return;
      const isHidden = pop.hasAttribute('hidden');
      // close others
      feed.querySelectorAll('[data-menu-pop]').forEach(x => { if (x !== pop) x.setAttribute('hidden', ''); });
      if (isHidden) pop.removeAttribute('hidden');
      else pop.setAttribute('hidden', '');
    });
  });

  feed.querySelectorAll('.menu__item').forEach(item => {
    item.addEventListener('click', () => {
      const act = item.dataset.act;
      if (act === 'copy') toast('Demo: copy link');
      else if (act === 'save') toast('Demo: đã lưu');
      else toast('Demo: đã gửi report');
      // close all
      feed.querySelectorAll('[data-menu-pop]').forEach(x => x.setAttribute('hidden', ''));
    });
  });

  // Outside click closing is handled globally (registered once)

  feed.querySelectorAll('[data-share]').forEach(btn => {
    btn.addEventListener('click', () => toast('Demo: share sheet'));
  });

  feed.querySelectorAll('[data-like]').forEach(btn => {
    btn.addEventListener('click', () => {
      const postId = btn.dataset.like;
      // quick tap: toggle 👍
      const current = myReaction(db, postId, me.id);
      setReaction(db, postId, me.id, current === 'like' ? null : 'like');
      saveDb(db);
      drawFeed(me);
    });
  });

  // reaction picker open
  feed.querySelectorAll('[data-react-open]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const postId = btn.dataset.reactOpen;
      const pop = feed.querySelector(`[data-react-pop="${postId}"]`);
      if (!pop) return;
      const isHidden = pop.hasAttribute('hidden');
      feed.querySelectorAll('[data-react-pop]').forEach(x => { if (x !== pop) x.setAttribute('hidden',''); });
      if (isHidden) pop.removeAttribute('hidden');
      else pop.setAttribute('hidden','');
    });
  });

  feed.querySelectorAll('[data-react]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const postId = btn.dataset.post;
      const reactionId = btn.dataset.react;
      const current = myReaction(db, postId, me.id);
      setReaction(db, postId, me.id, current === reactionId ? null : reactionId);
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
  const comments = (db.comments[p.id] || []);

  const mine = myReaction(db, p.id, me.id);
  const counts = reactionCounts(db, p.id);
  const top = topReactions(db, p.id);
  const totalReacts = Object.values(counts).reduce((s, n) => s + n, 0);

  const media = p.media || autoMediaForPost(p);
  const share = autoShareCardForPost(p);

  return `
    <article class="card post">
      <div class="post__top">
        <span class="avatar">${u?.avatar || '🙂'}</span>
        <div style="flex:1">
          <div class="post__name"><a href="javascript:void(0)" data-open="${p.userId}">${esc(u?.name || 'Unknown')}</a></div>
          <div class="post__time">${fmtTime(p.ts)}</div>
        </div>

        <div class="post__menu">
          <button class="iconBtn" type="button" aria-label="Menu" data-menu="${p.id}">⋯</button>
          <div class="menu" data-menu-pop="${p.id}" hidden>
            <button class="menu__item" type="button" data-act="save" data-post="${p.id}">Lưu bài viết (demo)</button>
            <button class="menu__item" type="button" data-act="report" data-post="${p.id}">Báo cáo (demo)</button>
            <button class="menu__item" type="button" data-act="copy" data-post="${p.id}">Copy link (demo)</button>
          </div>
        </div>

        <span class="tag">${mine ? ('Bạn đã ' + (REACTIONS.find(r=>r.id===mine)?.label || 'react')) : 'Bài viết'}</span>
      </div>
      <p class="post__text">${esc(p.text)}</p>

      ${media ? `<div class="post__media" aria-hidden="true"><span class="post__mediaEmoji">${media.emoji}</span></div>` : ''}
      ${share ? `
        <div class="shareCard" aria-label="Shared link preview">
          <div class="shareCard__thumb">${share.emoji}</div>
          <div class="shareCard__body">
            <div class="shareCard__site">${esc(share.site)}</div>
            <div class="shareCard__title">${esc(share.title)}</div>
            <div class="shareCard__desc">${esc(share.desc)}</div>
          </div>
        </div>
      ` : ''}

      <div class="post__actions">
        <div class="reactWrap">
          <button class="pill btn ${mine ? 'btn--primary' : ''}" type="button" data-like="${p.id}">
            ${REACTIONS.find(r=>r.id===mine)?.emoji || '👍'} ${REACTIONS.find(r=>r.id===mine)?.label || 'Like'}
          </button>
          <button class="reactOpen" type="button" data-react-open="${p.id}" aria-label="Chọn reaction">▾</button>
          <div class="reactPop" data-react-pop="${p.id}" hidden>
            ${REACTIONS.map(r => `<button class="react" type="button" data-react="${r.id}" data-post="${p.id}" title="${r.label}">${r.emoji}</button>`).join('')}
          </div>
        </div>

        <div class="reactSummary">
          ${totalReacts ? `<span class="reactIcons">${top.join(' ')}</span> <span>${totalReacts}</span>` : `<span class="muted">0 reactions</span>`}
        </div>

        <span class="pill">💬 Comment (${comments.length})</span>
        <button class="pill btn" type="button" data-share="${p.id}">🔁 Share</button>
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
  // Sprinkle a few media blocks for "Facebook feel"
  const last = p.id?.charCodeAt(p.id.length - 1) || 0;
  if (last % 4 !== 0) return null;
  const emoji = ['🖼️','🌆','🎉','📸'][last % 4];
  return { kind: 'photo', emoji };
}

// --- Story Viewer ---
const STORY = {
  durationMs: 4200,
  timer: null,
  idx: 0,
  items: [],
  owner: null,
  me: null,
};

function storiesForUser(userId) {
  // Simple generated stories: 4 slides per user
  const u = userById(userId) || { name: 'Unknown', avatar: '🙂' };
  const palette = ['🪐','🌌','✨','🚀','🧠','🎨','🧩','📰'];
  const base = userId.charCodeAt(userId.length - 1) || 1;
  return Array.from({ length: 4 }).map((_, i) => {
    const emoji = palette[(base + i) % palette.length];
    return {
      id: `${userId}_s${i+1}`,
      userId,
      emoji,
      ts: Date.now() - (i * 1000 * 60 * 12 + (base % 10) * 1000 * 10),
    };
  });
}

function openStoryViewer(me, userId) {
  const dialog = document.getElementById('storyDialog');
  if (!dialog) return;

  STORY.me = me;
  STORY.owner = userById(userId) || me;
  STORY.items = storiesForUser(userId);
  STORY.idx = 0;

  renderStoryUi();
  dialog.showModal();

  // mark seen
  const seen = loadSeenStories();
  seen.add(userId);
  saveSeenStories(seen);
  // reflect seen state in stories bar
  renderStories(me);

  startStoryTimer();
}

function closeStoryViewer() {
  const dialog = document.getElementById('storyDialog');
  if (!dialog) return;
  stopStoryTimer();
  dialog.close();
}

function stopStoryTimer() {
  if (STORY.timer) {
    clearInterval(STORY.timer);
    STORY.timer = null;
  }
}

function startStoryTimer() {
  stopStoryTimer();
  const startedAt = Date.now();
  const fill = () => {
    const elapsed = Date.now() - startedAt;
    const pct = Math.min(100, (elapsed / STORY.durationMs) * 100);
    const f = document.querySelector(`[data-story-fill="${STORY.idx}"]`);
    if (f) f.style.width = pct + '%';
    if (pct >= 100) {
      nextStory();
    }
  };

  // init bar
  const f = document.querySelector(`[data-story-fill="${STORY.idx}"]`);
  if (f) f.style.width = '0%';

  STORY.timer = setInterval(fill, 40);
}

function renderStoryUi() {
  const owner = STORY.owner;
  const item = STORY.items[STORY.idx];
  if (!owner || !item) return;

  document.getElementById('storyAvatar').textContent = owner.avatar;
  document.getElementById('storyName').textContent = owner.name;
  document.getElementById('storyTime').textContent = fmtTime(item.ts);
  document.getElementById('storyContent').textContent = item.emoji;

  // progress bars
  const prog = document.getElementById('storyProgress');
  prog.innerHTML = STORY.items.map((_, i) => {
    const done = i < STORY.idx;
    return `
      <div class="storyProgress__bar">
        <div class="storyProgress__fill" data-story-fill="${i}" style="width:${done ? 100 : 0}%"></div>
      </div>
    `;
  }).join('');

  // nav availability
  document.getElementById('storyPrev').disabled = STORY.idx === 0;
}

function prevStory() {
  if (STORY.idx <= 0) return;
  STORY.idx -= 1;
  renderStoryUi();
  startStoryTimer();
}

function nextStory() {
  if (STORY.idx >= STORY.items.length - 1) {
    closeStoryViewer();
    return;
  }
  STORY.idx += 1;
  renderStoryUi();
  startStoryTimer();
}

function installStoryHandlers() {
  const dialog = document.getElementById('storyDialog');
  if (!dialog) return;

  // close
  dialog.addEventListener('close', () => stopStoryTimer());

  document.getElementById('storyPrev').addEventListener('click', prevStory);
  document.getElementById('storyNext').addEventListener('click', nextStory);

  const reply = document.getElementById('storyReply');
  document.getElementById('storySend').addEventListener('click', () => {
    const t = (reply.value || '').trim();
    if (!t) return;
    reply.value = '';
    toast('Demo: đã gửi reply');
  });

  // click left/right to navigate
  const stage = document.getElementById('storyStage');
  stage.addEventListener('click', (e) => {
    const r = stage.getBoundingClientRect();
    const x = e.clientX - r.left;
    if (x < r.width * 0.35) prevStory();
    else nextStory();
  });

  // keyboard
  document.addEventListener('keydown', (e) => {
    if (!dialog.open) return;
    if (e.key === 'ArrowLeft') prevStory();
    if (e.key === 'ArrowRight') nextStory();
  });
}

function autoShareCardForPost(p) {
  // Sprinkle some link previews
  const last = p.id?.charCodeAt(p.id.length - 1) || 0;
  if (last % 5 !== 0) return null;
  const options = [
    { site: 'plutoso.app', title: 'PlutoSo — Social demo', desc: 'UI giống Facebook, chạy GitHub Pages.', emoji: '🔗' },
    { site: 'news.demo', title: 'Tin nóng (demo)', desc: 'Bản tin tổng hợp — chỉ là placeholder.', emoji: '📰' },
    { site: 'dev.blog', title: 'Bài viết kỹ thuật', desc: 'Tối ưu UI, layout, micro-interactions.', emoji: '🧩' },
  ];
  return options[last % options.length];
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

function closeAllPopovers(root=document) {
  root.querySelectorAll('[data-menu-pop]').forEach(x => x.setAttribute('hidden', ''));
  root.querySelectorAll('[data-react-pop]').forEach(x => x.setAttribute('hidden', ''));
}

function ensureGlobalUiHandlers() {
  if (window.__plutosoUiHandlersInstalled) return;
  window.__plutosoUiHandlersInstalled = true;

  // Click outside popovers closes them.
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (t && (t.closest?.('.post__menu') || t.closest?.('.reactWrap'))) {
      return;
    }
    closeAllPopovers(document);
  });

  // Escape closes popovers.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllPopovers(document);
    }
  });
}

// events
window.addEventListener('hashchange', render);

// init
ensureGlobalUiHandlers();
installStoryHandlers();
render();
