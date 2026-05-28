/**
 * AgroHarvest Chat Widget
 * Floating real-time chat for all roles: farmer, customer, dealer, agent
 * Usage: <script src="chat.js"></script> at bottom of any page
 */
(function () {
    'use strict';

    const ME = localStorage.getItem('farmerName') || 'Guest';
    const MY_ROLE = localStorage.getItem('userRole') || 'customer';
    if (!ME || ME === 'Guest') return; // not logged in

    // ── Inject CSS ────────────────────────────────────────────────────────────
    const style = document.createElement('style');
    style.textContent = `
        #agro-chat-btn {
            position: fixed; bottom: 24px; right: 24px; z-index: 9998;
            width: 56px; height: 56px; border-radius: 50%;
            background: linear-gradient(135deg,#16a34a,#15803d);
            color: #fff; border: none; cursor: pointer;
            box-shadow: 0 8px 24px rgba(22,163,74,0.4);
            display: flex; align-items: center; justify-content: center;
            transition: transform 0.2s, box-shadow 0.2s;
            font-family: 'Material Symbols Outlined'; font-size: 26px;
        }
        #agro-chat-btn:hover { transform: scale(1.1); box-shadow: 0 12px 32px rgba(22,163,74,0.5); }
        #agro-chat-badge {
            position: absolute; top: -4px; right: -4px;
            background: #d97706; color: #fff;
            font-family: Manrope,sans-serif; font-size: 10px; font-weight: 900;
            min-width: 18px; height: 18px; border-radius: 9px; padding: 0 4px;
            display: none; align-items: center; justify-content: center;
            border: 2px solid #fff; line-height: 1;
        }
        #agro-chat-panel {
            position: fixed; bottom: 90px; right: 24px; z-index: 9999;
            width: 360px; max-height: 520px;
            background: #fff; border-radius: 24px;
            box-shadow: 0 24px 60px rgba(6,78,59,0.18), 0 0 0 1px rgba(22,163,74,0.12);
            display: none; flex-direction: column; overflow: hidden;
            font-family: Manrope,sans-serif;
            animation: chatSlideIn 0.25s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes chatSlideIn {
            from { opacity: 0; transform: translateY(20px) scale(0.95); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        #agro-chat-panel.open { display: flex; }
        .chat-header {
            background: linear-gradient(135deg,#16a34a,#15803d);
            color: #fff; padding: 16px 20px;
            display: flex; align-items: center; gap: 12px;
            flex-shrink: 0;
        }
        .chat-header-back {
            background: rgba(255,255,255,0.2); border: none; color: #fff;
            width: 32px; height: 32px; border-radius: 50%; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            font-family: 'Material Symbols Outlined'; font-size: 18px;
            transition: background 0.2s; flex-shrink: 0;
        }
        .chat-header-back:hover { background: rgba(255,255,255,0.35); }
        .chat-header-title { flex: 1; font-weight: 900; font-size: 14px; letter-spacing: -0.3px; }
        .chat-header-sub { font-size: 10px; font-weight: 600; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.1em; }
        .chat-close-btn {
            background: rgba(255,255,255,0.2); border: none; color: #fff;
            width: 32px; height: 32px; border-radius: 50%; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            font-family: 'Material Symbols Outlined'; font-size: 18px;
        }
        .chat-close-btn:hover { background: rgba(255,255,255,0.35); }
        #chat-list-view, #chat-thread-view, #chat-new-view {
            display: flex; flex-direction: column; flex: 1; overflow: hidden;
        }
        .chat-search {
            padding: 12px 16px; border-bottom: 1px solid rgba(22,163,74,0.12);
            flex-shrink: 0;
        }
        .chat-search input {
            width: 100%; padding: 8px 14px; border-radius: 20px;
            border: 1.5px solid rgba(22,163,74,0.2);
            font-family: Manrope,sans-serif; font-size: 13px; outline: none;
            background: #f4f9f4; color: #064e3b; box-sizing: border-box;
        }
        .chat-search input:focus { border-color: #16a34a; }
        .chat-conversations { flex: 1; overflow-y: auto; }
        .conv-item {
            display: flex; align-items: center; gap: 12px;
            padding: 12px 16px; cursor: pointer; transition: background 0.15s;
            border-bottom: 1px solid rgba(22,163,74,0.06);
        }
        .conv-item:hover { background: #f4f9f4; }
        .conv-avatar {
            width: 42px; height: 42px; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-weight: 900; font-size: 16px; flex-shrink: 0;
            font-family: Epilogue,serif;
        }
        .conv-info { flex: 1; min-width: 0; }
        .conv-name { font-weight: 800; font-size: 13px; color: #064e3b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .conv-preview { font-size: 11px; color: #14532d; opacity: 0.65; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
        .conv-meta { text-align: right; flex-shrink: 0; }
        .conv-time { font-size: 10px; color: #14532d; opacity: 0.5; font-weight: 600; }
        .conv-unread {
            background: #d97706; color: #fff; border-radius: 10px;
            font-size: 10px; font-weight: 900; padding: 1px 6px;
            margin-top: 4px; display: inline-block;
        }
        #chat-messages-wrap {
            flex: 1; overflow-y: auto; padding: 12px 16px;
            display: flex; flex-direction: column; gap: 8px;
            background: #f9fdf9;
        }
        .msg-bubble {
            max-width: 80%; padding: 8px 12px; border-radius: 18px;
            font-size: 13px; line-height: 1.45; word-break: break-word;
        }
        .msg-bubble.sent {
            align-self: flex-end; background: #16a34a; color: #fff;
            border-bottom-right-radius: 4px;
        }
        .msg-bubble.recv {
            align-self: flex-start; background: #fff; color: #064e3b;
            border: 1px solid rgba(22,163,74,0.15); border-bottom-left-radius: 4px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }
        .msg-time { font-size: 9px; opacity: 0.6; margin-top: 2px; display: block; text-align: right; }
        .chat-input-row {
            display: flex; align-items: center; gap: 8px;
            padding: 12px 16px; border-top: 1px solid rgba(22,163,74,0.12);
            background: #fff; flex-shrink: 0;
        }
        .chat-input-row input {
            flex: 1; padding: 10px 16px; border-radius: 20px;
            border: 1.5px solid rgba(22,163,74,0.2);
            font-family: Manrope,sans-serif; font-size: 13px; outline: none;
            background: #f4f9f4; color: #064e3b;
        }
        .chat-input-row input:focus { border-color: #16a34a; }
        .chat-send-btn {
            width: 38px; height: 38px; border-radius: 50%;
            background: #16a34a; color: #fff; border: none; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            font-family: 'Material Symbols Outlined'; font-size: 18px;
            transition: background 0.2s; flex-shrink: 0;
        }
        .chat-send-btn:hover { background: #15803d; }
        .chat-new-btn {
            margin: 12px 16px; padding: 10px; border-radius: 12px;
            background: #f4f9f4; border: 1.5px dashed rgba(22,163,74,0.3);
            color: #16a34a; font-weight: 800; font-size: 12px; cursor: pointer;
            display: flex; align-items: center; justify-content: center; gap: 8px;
            transition: background 0.15s; font-family: Manrope,sans-serif;
            text-transform: uppercase; letter-spacing: 0.05em;
        }
        .chat-new-btn:hover { background: #e8f5e9; }
        .user-list-item {
            display: flex; align-items: center; gap: 12px;
            padding: 10px 16px; cursor: pointer; transition: background 0.15s;
            border-bottom: 1px solid rgba(22,163,74,0.06);
        }
        .user-list-item:hover { background: #f4f9f4; }
        .role-pill {
            font-size: 9px; font-weight: 900; text-transform: uppercase;
            padding: 2px 6px; border-radius: 6px; letter-spacing: 0.08em;
        }
        .role-farmer  { background: #dcfce7; color: #14532d; }
        .role-customer{ background: #dbeafe; color: #1e40af; }
        .role-dealer  { background: #fef9c3; color: #854d0e; }
        .role-agent   { background: #f3e8ff; color: #6b21a8; }
        .chat-empty { padding: 32px 16px; text-align: center; color: #14532d; opacity: 0.5; font-size: 13px; font-weight: 600; }
    `;
    document.head.appendChild(style);

    // ── Build HTML ────────────────────────────────────────────────────────────
    const wrap = document.createElement('div');
    wrap.innerHTML = `
    <button id="agro-chat-btn" title="Open Chat">
        <span style="font-family:'Material Symbols Outlined';font-size:26px">chat</span>
        <span id="agro-chat-badge"></span>
    </button>

    <div id="agro-chat-panel">
        <!-- HEADER -->
        <div class="chat-header" id="chat-header">
            <button class="chat-header-back" id="chat-back-btn" style="display:none">arrow_back</button>
            <div style="flex:1">
                <div class="chat-header-title" id="chat-header-title">💬 Messages</div>
                <div class="chat-header-sub" id="chat-header-sub">${ME} · ${MY_ROLE}</div>
            </div>
            <button class="chat-close-btn" id="chat-close-btn">close</button>
        </div>

        <!-- CONVERSATION LIST VIEW -->
        <div id="chat-list-view">
            <div class="chat-search">
                <input id="chat-search-input" placeholder="Search conversations..." oninput="window._chatSearchFilter(this.value)">
            </div>
            <div class="chat-conversations" id="chat-conv-list">
                <div class="chat-empty">Loading conversations...</div>
            </div>
            <button class="chat-new-btn" id="chat-new-btn">
                <span style="font-family:'Material Symbols Outlined';font-size:16px">add_comment</span>
                New Conversation
            </button>
        </div>

        <!-- NEW CONVERSATION VIEW -->
        <div id="chat-new-view" style="display:none">
            <div class="chat-search">
                <input id="chat-user-search" placeholder="Search users..." oninput="window._chatUserFilter(this.value)">
            </div>
            <div class="chat-conversations" id="chat-user-list">
                <div class="chat-empty">Loading users...</div>
            </div>
        </div>

        <!-- THREAD VIEW -->
        <div id="chat-thread-view" style="display:none">
            <div id="chat-messages-wrap"></div>
            <div class="chat-input-row">
                <input id="chat-msg-input" placeholder="Type a message..." onkeydown="if(event.key==='Enter')window._chatSend()">
                <button class="chat-send-btn" onclick="window._chatSend()">send</button>
            </div>
        </div>
    </div>`;
    document.body.appendChild(wrap);

    // ── State ─────────────────────────────────────────────────────────────────
    let activePartner = null; // { name, role }
    let allConversations = [];
    let allUsers = [];
    let unreadTotal = 0;

    const panel      = document.getElementById('agro-chat-panel');
    const badge      = document.getElementById('agro-chat-badge');
    const listView   = document.getElementById('chat-list-view');
    const newView    = document.getElementById('chat-new-view');
    const threadView = document.getElementById('chat-thread-view');
    const backBtn    = document.getElementById('chat-back-btn');
    const headerTitle= document.getElementById('chat-header-title');
    const headerSub  = document.getElementById('chat-header-sub');
    const msgsWrap   = document.getElementById('chat-messages-wrap');
    const msgInput   = document.getElementById('chat-msg-input');

    // ── Avatar helpers ────────────────────────────────────────────────────────
    const ROLE_COLORS = {
        farmer:   ['#dcfce7','#14532d'],
        customer: ['#dbeafe','#1e40af'],
        dealer:   ['#fef9c3','#854d0e'],
        agent:    ['#f3e8ff','#6b21a8'],
    };
    function avatar(name, role) {
        const [bg, fg] = ROLE_COLORS[role] || ['#f4f9f4','#064e3b'];
        const initial = (name || '?')[0].toUpperCase();
        return `<div class="conv-avatar" style="background:${bg};color:${fg}">${initial}</div>`;
    }
    function rolePill(role) {
        return `<span class="role-pill role-${role}">${role}</span>`;
    }
    function formatTime(ts) {
        if (!ts) return '';
        const d = new Date(ts);
        const now = new Date();
        if (d.toDateString() === now.toDateString()) {
            return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        }
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    // ── View switching ────────────────────────────────────────────────────────
    function showList() {
        listView.style.display = 'flex';
        newView.style.display  = 'none';
        threadView.style.display = 'none';
        backBtn.style.display  = 'none';
        headerTitle.textContent = '💬 Messages';
        headerSub.textContent   = `${ME} · ${MY_ROLE}`;
        activePartner = null;
        loadConversations();
    }

    function showNewConv() {
        listView.style.display   = 'none';
        newView.style.display    = 'flex';
        threadView.style.display = 'none';
        backBtn.style.display    = 'flex';
        headerTitle.textContent  = 'New Conversation';
        headerSub.textContent    = 'Select a person to chat with';
        loadUsers();
    }

    function showThread(partner) {
        activePartner = partner;
        listView.style.display   = 'none';
        newView.style.display    = 'none';
        threadView.style.display = 'flex';
        backBtn.style.display    = 'flex';
        headerTitle.textContent  = partner.name;
        headerSub.textContent    = partner.role;
        loadThread();
    }

    // ── Load conversations ────────────────────────────────────────────────────
    async function loadConversations() {
        try {
            const res = await fetch(`/api/messages/conversations/${encodeURIComponent(ME)}`);
            allConversations = await res.json();
            renderConversations(allConversations);
            updateUnreadBadge();
        } catch (e) {
            document.getElementById('chat-conv-list').innerHTML = '<div class="chat-empty">Could not load messages.</div>';
        }
    }

    function renderConversations(convs) {
        const el = document.getElementById('chat-conv-list');
        if (!convs || convs.length === 0) {
            el.innerHTML = '<div class="chat-empty">No conversations yet.<br>Start one below! 👇</div>';
            return;
        }
        el.innerHTML = convs.map(c => {
            const unreadHtml = c.unread_count > 0
                ? `<span class="conv-unread">${c.unread_count}</span>` : '';
            return `<div class="conv-item" onclick="window._chatOpenConv('${c.partner}','${c.partner_role}')">
                ${avatar(c.partner, c.partner_role)}
                <div class="conv-info">
                    <div class="conv-name">${c.partner}</div>
                    <div class="conv-preview">${c.sender_name === ME ? 'You: ' : ''}${c.message || ''}</div>
                </div>
                <div class="conv-meta">
                    <div class="conv-time">${formatTime(c.created_at)}</div>
                    ${unreadHtml}
                </div>
            </div>`;
        }).join('');
    }

    function updateUnreadBadge() {
        unreadTotal = allConversations.reduce((s,c) => s + parseInt(c.unread_count || 0), 0);
        if (unreadTotal > 0) {
            badge.style.display = 'flex';
            badge.textContent = unreadTotal > 9 ? '9+' : unreadTotal;
        } else {
            badge.style.display = 'none';
        }
    }

    // ── Load users ────────────────────────────────────────────────────────────
    async function loadUsers() {
        try {
            const res = await fetch('/api/users');
            allUsers = (await res.json()).filter(u => u.name !== ME);
            renderUserList(allUsers);
        } catch (e) {
            document.getElementById('chat-user-list').innerHTML = '<div class="chat-empty">Could not load users.</div>';
        }
    }

    function renderUserList(users) {
        const el = document.getElementById('chat-user-list');
        if (!users.length) {
            el.innerHTML = '<div class="chat-empty">No users found.</div>';
            return;
        }
        el.innerHTML = users.map(u => `
            <div class="user-list-item" onclick="window._chatOpenConv('${u.name}','${u.role}')">
                ${avatar(u.name, u.role)}
                <div class="conv-info">
                    <div class="conv-name">${u.name}</div>
                    <div style="margin-top:4px">${rolePill(u.role)}</div>
                </div>
            </div>`).join('');
    }

    // ── Load thread ───────────────────────────────────────────────────────────
    async function loadThread() {
        if (!activePartner) return;
        try {
            const res = await fetch(`/api/messages/${encodeURIComponent(ME)}/${encodeURIComponent(activePartner.name)}`);
            const msgs = await res.json();
            renderMessages(msgs);
            updateUnreadBadge();
        } catch (e) {}
    }

    function renderMessages(msgs) {
        if (!msgs || msgs.length === 0) {
            msgsWrap.innerHTML = `<div class="chat-empty">No messages yet. Say hello! 👋</div>`;
            return;
        }
        msgsWrap.innerHTML = msgs.map(m => {
            const isSent = m.sender_name === ME;
            return `<div class="msg-bubble ${isSent ? 'sent' : 'recv'}">
                ${m.message}
                <span class="msg-time">${formatTime(m.created_at)}</span>
            </div>`;
        }).join('');
        msgsWrap.scrollTop = msgsWrap.scrollHeight;
    }

    // ── Send message ──────────────────────────────────────────────────────────
    window._chatSend = async function () {
        const text = msgInput.value.trim();
        if (!text || !activePartner) return;
        msgInput.value = '';
        try {
            const res = await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    senderName: ME, senderRole: MY_ROLE,
                    receiverName: activePartner.name, receiverRole: activePartner.role,
                    message: text
                })
            });
            const result = await res.json();
            if (result.success) {
                // Append optimistically
                const div = document.createElement('div');
                div.className = 'msg-bubble sent';
                div.innerHTML = `${text}<span class="msg-time">now</span>`;
                const empty = msgsWrap.querySelector('.chat-empty');
                if (empty) empty.remove();
                msgsWrap.appendChild(div);
                msgsWrap.scrollTop = msgsWrap.scrollHeight;
            }
        } catch (e) {}
    };

    // ── Filter helpers ────────────────────────────────────────────────────────
    window._chatSearchFilter = function (q) {
        const filtered = allConversations.filter(c => c.partner.toLowerCase().includes(q.toLowerCase()));
        renderConversations(filtered);
    };
    window._chatUserFilter = function (q) {
        const filtered = allUsers.filter(u => u.name.toLowerCase().includes(q.toLowerCase()) || u.role.includes(q.toLowerCase()));
        renderUserList(filtered);
    };

    window._chatOpenConv = function (name, role) {
        showThread({ name, role });
    };

    // ── Panel toggle ──────────────────────────────────────────────────────────
    document.getElementById('agro-chat-btn').onclick = function () {
        const isOpen = panel.classList.contains('open');
        if (isOpen) {
            panel.classList.remove('open');
        } else {
            panel.classList.add('open');
            showList();
        }
    };
    document.getElementById('chat-close-btn').onclick = function () {
        panel.classList.remove('open');
    };
    backBtn.onclick = function () {
        if (activePartner || newView.style.display === 'flex') {
            showList();
        }
    };
    document.getElementById('chat-new-btn').onclick = showNewConv;

    // ── WebSocket (reuse page's WS or create own) ────────────────────────────
    let chatWS;
    function initChatWS() {
        chatWS = new WebSocket(`ws://${window.location.host}`);
        chatWS.onopen = () => {
            chatWS.send(JSON.stringify({ type: 'REGISTER', userName: ME, userRole: MY_ROLE }));
        };
        chatWS.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'NEW_MESSAGE') {
                    const msg = data.message;
                    // Show in thread if open
                    if (activePartner && activePartner.name === msg.sender_name && panel.classList.contains('open')) {
                        const div = document.createElement('div');
                        div.className = 'msg-bubble recv';
                        div.innerHTML = `${msg.message}<span class="msg-time">now</span>`;
                        const empty = msgsWrap.querySelector('.chat-empty');
                        if (empty) empty.remove();
                        msgsWrap.appendChild(div);
                        msgsWrap.scrollTop = msgsWrap.scrollHeight;
                        // Mark as read immediately
                        fetch(`/api/messages/${encodeURIComponent(ME)}/${encodeURIComponent(msg.sender_name)}`).catch(()=>{});
                    } else {
                        // Bump badge
                        unreadTotal++;
                        badge.style.display = 'flex';
                        badge.textContent = unreadTotal > 9 ? '9+' : unreadTotal;
                        // Refresh conversation list if visible
                        if (panel.classList.contains('open') && listView.style.display !== 'none') {
                            loadConversations();
                        }
                    }
                }
            } catch(e) {}
        };
        chatWS.onclose = () => setTimeout(initChatWS, 3000);
    }
    initChatWS();

    // Poll unread count every 30s when panel is closed
    setInterval(() => {
        if (!panel.classList.contains('open')) {
            fetch(`/api/messages/unread/${encodeURIComponent(ME)}`)
                .then(r => r.json())
                .then(data => {
                    unreadTotal = data.count || 0;
                    if (unreadTotal > 0) {
                        badge.style.display = 'flex';
                        badge.textContent = unreadTotal > 9 ? '9+' : unreadTotal;
                    } else {
                        badge.style.display = 'none';
                    }
                }).catch(() => {});
        }
    }, 30000);
})();
