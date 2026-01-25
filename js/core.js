/* ================================
   SOURCE: js/auth.js
   PURPOSE: Authentication and user management
   ================================ */

// Supabase Auth Implementation
const Auth = {
    currentUser: null,
    supabase: null,

    init: async function () {
        // Get Supabase client from Store
        if (Store && Store.supabase) {
            this.supabase = Store.supabase;
        } else {
            console.error("Supabase client not initialized");
            return false;
        }

        // 1. Listen for Auth State Changes
        this.supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                console.log("Auth Event:", event);
            }
        });

        // 2. Check for existing session
        const { data: { session }, error } = await this.supabase.auth.getSession();

        if (error) {
            console.error("Session error:", error);
            return false;
        }

        if (session) {
            // Check admin status before allowing full login
            const statusAllowed = await this.checkUserStatus(session.user.id);
            if (!statusAllowed) {
                await this.supabase.auth.signOut();
                return false;
            }

            this.currentUser = {
                id: session.user.id,
                email: session.user.email
            };

            return true; // Logged in
        }

        return false; // Not logged in
    },

    checkUserStatus: async function (userId) {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('status')
                .eq('id', userId)
                .single();

            if (error) {
                console.error("Status check failed or pending:", error);
                return false;
            }

            if (data) {
                if (data.status === 'banned') {
                    alert("Account Banned");
                    return false;
                }
                if (data.status === 'deleted') {
                    alert("Login Rejected By Admin");
                    return false;
                }
                // 'user_added' and 'confirmed' are valid
                return true;
            }
            return false;
        } catch (e) {
            console.error("Auth status error", e);
            return false;
        }
    },

    login: async function (email, password) {
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                return { success: false, message: error.message };
            }

            // Check status immediately after login
            const statusAllowed = await this.checkUserStatus(data.user.id);
            if (!statusAllowed) {
                await this.supabase.auth.signOut();
                return { success: false, message: "Account access restricted." };
            }

            this.currentUser = {
                id: data.user.id,
                email: data.user.email
            };

            return { success: true };
        } catch (err) {
            return { success: false, message: "Login failed: " + err.message };
        }
    },

    register: async function (email, password) {
        try {
            // Get the current URL to ensure redirect comes back here
            const redirectUrl = window.location.href.split('#')[0].split('?')[0];

            const { data, error } = await this.supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    emailRedirectTo: redirectUrl // Forces return to this page
                }
            });

            if (error) {
                return { success: false, message: error.message };
            }

            // If Confirm Email is ON in Supabase:
            if (data.user && !data.session) {
                return { success: false, message: "Verification link sent! Check your email." };
            }

            // If Confirm Email is OFF (Auto login):
            if (data.session) {
                this.currentUser = {
                    id: data.user.id,
                    email: data.user.email
                };
                return { success: true };
            }

            return { success: false, message: "Unexpected signup state." };

        } catch (err) {
            return { success: false, message: "Signup failed: " + err.message };
        }
    },

    logout: async function () {
        // CHANGED: Using new 'logout' mode instead of generic 'delete-confirm'
        UI.openModal('logout', null, null, async () => {
            try {
                await this.supabase.auth.signOut();
                this.currentUser = null;
                window.location.reload();
            } catch (err) {
                console.error("Logout error:", err);
                window.location.reload(); // Force reload anyway
            }
        });
    },

    getCurrentUserId: function () {
        return this.currentUser ? this.currentUser.id : null;
    },

    showAuth: function () {
        if (AuthUI && AuthUI.els) {
            AuthUI.els.overlay.style.display = 'flex';
            AuthUI.els.app.style.display = 'none';
        }
    }
};

// UI Handler for Auth Forms
const AuthUI = {
    isLoginMode: true,
    els: {},

    init: function () {
        this.els = {
            overlay: document.getElementById('auth-overlay'),
            app: document.getElementById('app-wrapper'),
            loader: document.querySelector('.auth-loader'),
            authBox: document.querySelector('.auth-box'),
            title: document.getElementById('auth-title'),
            subtitle: document.getElementById('auth-subtitle'),
            btn: document.getElementById('auth-submit-btn'),
            switchText: document.getElementById('auth-switch-text'),
            switchBtn: document.getElementById('auth-switch-btn'),
            email: document.getElementById('auth-email'),
            pass: document.getElementById('auth-pass'),
            error: document.getElementById('auth-error'),
            form: document.getElementById('auth-form')
        };

        this.els.form.onsubmit = (e) => {
            e.preventDefault();
            this.handleSubmit();
        };
    },

    toggleMode: function () {
        this.isLoginMode = !this.isLoginMode;
        this.els.error.style.display = 'none';
        this.els.email.value = '';
        this.els.pass.value = '';

        if (this.isLoginMode) {
            this.els.title.innerText = "Welcome Back";
            this.els.subtitle.innerText = "Login to access your private notes";
            this.els.btn.innerText = "Login";
            this.els.switchText.innerText = "Don't have an account?";
            this.els.switchBtn.innerText = "Sign Up";
        } else {
            this.els.title.innerText = "Create Account";
            this.els.subtitle.innerText = "Start your distraction-free journey";
            this.els.btn.innerText = "Sign Up";
            this.els.switchText.innerText = "Already have an account?";
            this.els.switchBtn.innerText = "Login";
        }
    },

    handleSubmit: async function () {
        const email = this.els.email.value.trim();
        const pass = this.els.pass.value;

        if (!email) {
            this.showError("Email is required");
            return;
        }

        if (pass.length < 6) {
            this.showError("Password must be at least 6 characters");
            return;
        }

        this.els.btn.innerText = "Processing...";
        this.els.btn.disabled = true;
        this.els.error.style.display = 'none';

        let result;

        if (this.isLoginMode) {
            result = await Auth.login(email, pass);
        } else {
            result = await Auth.register(email, pass);
        }

        if (result.success) {
            // Normal Login Success
            this.showApp();
        } else {
            // Error or "Check Email" message
            this.showError(result.message);

            // Check if it was a "Check Email" message to change UI state
            if (result.message.includes("Check your email")) {
                this.els.title.innerText = "Verify Email";
                this.els.subtitle.innerText = "We sent a link to " + email;
                this.els.btn.style.display = "none"; // Hide button
            } else {
                this.els.btn.innerText = this.isLoginMode ? "Login" : "Sign Up";
                this.els.btn.disabled = false;
            }
        }
    },

    showError: function (msg) {
        this.els.error.innerText = msg;
        this.els.error.style.display = 'block';
    },

    showApp: function () {
        this.els.overlay.style.display = 'none';
        this.els.app.style.display = 'flex';
        // Initialize the main app now that we have a user
        initApp();

        // Show a gentle toast/alert if we just loaded
        if (window.location.hash && window.location.hash.includes('access_token')) {
            window.history.replaceState(null, null, window.location.pathname);
            console.log("Email verified & Logged in.");
        }
    },

    showLogin: function () {
        this.els.overlay.style.display = 'flex';
        this.els.app.style.display = 'none';
        if (this.els.loader) this.els.loader.style.display = 'none';
        if (this.els.authBox) this.els.authBox.style.display = 'block';
    },

    showAuth: function () {
        this.showLogin();
    }
};

// Check Login on Load
document.addEventListener('DOMContentLoaded', async () => {
    AuthUI.init();
    const isLoggedIn = await Auth.init();
    if (isLoggedIn) {
        AuthUI.showApp();
    } else {
        AuthUI.showLogin();
    }
});

/* ================================
   SOURCE: js/store.js
   PURPOSE: Data storage, Supabase integration, and note management
   ================================ */

// Initialize Supabase client immediately (before Auth needs it)
const _supabaseClient = (function () {
    const SUPABASE_URL = 'https://qtmtkivntdiswetuqlar.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0bXRraXZudGRpc3dldHVxbGFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0OTg0ODIsImV4cCI6MjA4NDA3NDQ4Mn0.2UokvTemzginYSYrDhCFjbtmBih_m0kV8kr1i2EYmzc';

    try {
        if (typeof supabase !== 'undefined' && SUPABASE_URL && SUPABASE_KEY) {
            return supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        }
    } catch (err) {
        console.error("Supabase client initialization error:", err);
    }
    return null;
})();

const Store = {
    supabase: _supabaseClient,
    notes: [],
    activeId: null,
    unsavedId: null,
    timer: null,

    init: async function () {
        // Ensure User is logged in
        if (!Auth.getCurrentUserId()) return;

        // Load data from Supabase
        if (this.supabase) {
            this.loadPinOrder();
            await this.loadNotesFromSupabase();

            // If no notes exist, create a default one
            if (this.notes.length === 0) {
                await this.createNote("Untitled");
            } else {
                // Set first note as active
                this.activeId = this.notes[0].id;
            }
        }
    },

    // =============================================
    // NOTES
    // =============================================

    loadNotesFromSupabase: async function () {
        try {
            const { data, error } = await this.supabase
                .from('notes')
                .select('*')
                .order('updated_at', { ascending: false });

            if (error) throw error;
            this.notes = data || [];
        } catch (e) {
            console.error("Load notes error:", e);
            this.notes = [];
        }
    },

    getActiveNote: function () {
        return this.notes.find(x => x.id === this.activeId);
    },

    createNote: async function (title) {
        console.log('createNote called with title:', title);

        // Save current note first
        if (this.activeId) this.saveImmediate();
        this.cancelSave();

        // Check user ID
        const userId = Auth.getCurrentUserId();
        console.log('User ID:', userId);

        if (!userId) {
            console.error('No user ID found - user may not be logged in');
            alert('Error: Not logged in. Please refresh the page.');
            return null;
        }

        if (!this.supabase) {
            console.error('Supabase client not initialized');
            alert('Error: Database connection failed. Please refresh the page.');
            return null;
        }

        try {
            console.log('Inserting note into Supabase...');
            const { data, error } = await this.supabase
                .from('notes')
                .insert([{
                    user_id: userId,
                    title: title || 'Untitled',
                    content: '',
                    is_public: false
                }])
                .select()
                .single();

            if (error) {
                console.error('Supabase insert error:', error);
                alert('Error creating note: ' + error.message);
                throw error;
            }

            console.log('Note created successfully:', data);

            // Add to local state (prepend to top)
            this.notes.unshift(data);
            this.activeId = data.id;

            return data.id;
        } catch (e) {
            console.error("Create note error:", e);
            return null;
        }
    },

    deleteNote: async function (id) {
        try {
            const { error } = await this.supabase
                .from('notes')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // Remove from local state
            this.notes = this.notes.filter(n => n.id !== id);

            // Select another note
            if (this.activeId === id) {
                if (this.notes.length > 0) {
                    this.activeId = this.notes[0].id;
                } else {
                    // Create a new note if empty to avoid broken UI
                    await this.createNote("Untitled");
                }
            }
        } catch (e) {
            console.error("Delete note error:", e);
        }
    },

    updateTitle: async function (id, title) {
        try {
            const { error } = await this.supabase
                .from('notes')
                .update({ title: title, updated_at: new Date() })
                .eq('id', id);

            if (error) throw error;

            // Update local state
            const note = this.notes.find(n => n.id === id);
            if (note) {
                note.title = title;
                note.updated_at = new Date().toISOString();
            }

            // Re-sort notes locally
            this.notes.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        } catch (e) {
            console.error("Update title error:", e);
        }
    },

    // --- PIN LOGIC ---
    pinnedOrder: [], // Cache for pin order

    loadPinOrder: function () {
        try {
            const stored = localStorage.getItem('focuspad_pin_order');
            if (stored) this.pinnedOrder = JSON.parse(stored);
        } catch (e) { console.error('Error loading pin order', e); }
    },

    savePinOrder: function () {
        localStorage.setItem('focuspad_pin_order', JSON.stringify(this.pinnedOrder));
    },

    getPinnedIndex: function (id) {
        const idx = this.pinnedOrder.indexOf(id);
        return idx === -1 ? 999999 : idx; // If not found, put at end
    },

    togglePinStatus: async function (id, status) {
        console.log('togglePinStatus called with:', id, status);

        try {
            const { data, error } = await this.supabase
                .from('notes')
                .update({ is_pinned: status, updated_at: new Date() })
                .eq('id', id)
                .select();

            if (error) {
                console.error('Supabase error toggling pin:', error);
                alert('Error: ' + error.message);
                return false;
            }

            const n = this.notes.find(x => x.id === id);
            if (n) {
                n.is_pinned = status;
                n.updated_at = new Date().toISOString();
                console.log('Local state updated:', n.title, 'is_pinned:', n.is_pinned);

                // Update Order
                if (status) {
                    // Pinning: Add to end if not present
                    if (!this.pinnedOrder.includes(id)) {
                        this.pinnedOrder.push(id);
                        this.savePinOrder();
                    }
                } else {
                    // Unpinning: Remove
                    this.pinnedOrder = this.pinnedOrder.filter(x => x !== id);
                    this.savePinOrder();
                }
            }

            return true;
        } catch (e) {
            console.error("Exception toggling pin status:", e);
            alert('Error toggling pin: ' + e.message);
            return false;
        }
    },

    // Get all notes - NO sorting, maintain original order
    getFilteredNotes: function () {
        // Return notes as-is - no sorting to prevent reordering
        return this.notes;
    },

    // --- PUBLIC SHARE LOGIC ---
    togglePublicStatus: async function (id, status) {
        const { error } = await this.supabase
            .from('notes')
            .update({ is_public: status })
            .eq('id', id);

        if (!error) {
            const n = this.notes.find(x => x.id === id);
            if (n) n.is_public = status;
            return true;
        }
        console.error("Error toggling public status:", error);
        return false;
    },

    save: function () {
        // Auto-save is always enabled now
        // const settings = Settings.getSettings ? Settings.getSettings() : { autoSave: true };
        // if (settings.autoSave === false) return;

        this.cancelSave();
        // Mark as unsaved visually
        if (this.activeId) {
            this.unsavedId = this.activeId;
            if (typeof UI !== 'undefined' && UI.setUnsaved) UI.setUnsaved(this.activeId, true);
        }
        this.saveTimeout = setTimeout(() => this.saveImmediate(), 500); // Auto-save after 500ms
    },

    cancelSave: function () {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
    },

    saveImmediate: async function () {
        const editor = document.getElementById('editor');
        const note = this.notes.find(x => x.id === this.activeId);

        // Clear unsaved state immediately for UI responsiveness
        this.unsavedId = null;
        if (typeof UI !== 'undefined' && UI.setUnsaved) UI.setUnsaved(this.activeId, false);

        if (note && editor) {
            let cleanContent = editor.innerHTML;

            // Feature Preservation: Strip search highlights before saving
            cleanContent = cleanContent.replace(/<mark class="search-highlight[^>]*>([^<]*)<\/mark>/gi, '$1');

            // CLEANUP: Remove Focus Mode classes to prevent saving 'dimmed' state to DB
            cleanContent = cleanContent.replace(/class="focused-block"/g, '');

            // Optimistic Update (no re-sorting to prevent position change)
            note.content = cleanContent;
            note.updated_at = new Date().toISOString();

            try {
                const { error } = await this.supabase
                    .from('notes')
                    .update({
                        content: cleanContent,
                        updated_at: new Date()
                    })
                    .eq('id', this.activeId);

                if (error) throw error;
            } catch (e) {
                console.error("Save error:", e);
            }
        }
    },

    // =============================================
    // LEGACY METHODS (Preserved for compatibility)
    // =============================================

    getIdKey: function () {
        return 'focuspad_active_id';
    },

    getStorageKey: function () {
        return 'focuspad_notes_' + Auth.getCurrentUserId();
    },

    saveToStorageOnly: function () {
        // No-op in Supabase version, but kept if UI calls it
    }
};

/* ================================
   SOURCE: js/main.js
   PURPOSE: App initialization, bootstrapping, and core event listeners
   ================================ */

async function initApp() {
    UI.cacheElements();
    await Auth.init();
    await Store.init();
    UI.renderChips();
    UI.loadNoteContent();

    document.execCommand('defaultParagraphSeparator', false, 'p');

    setupListeners();
}

function setupListeners() {
    // Context menu clicks
    const contextMenu = document.getElementById('chip-context-menu');
    if (contextMenu) {
        contextMenu.addEventListener('click', (e) => {
            const item = e.target.closest('.context-menu-item');
            if (item) {
                const action = item.dataset.action;
                const noteId = contextMenu.dataset.noteId;
                if (action && noteId) {
                    UI.handleChipContextAction(action, noteId);
                }
            }
        });
    }

    // Editor Events
    UI.els.editor.addEventListener('mouseup', () => {
        Logic.checkToolbarState();
        Logic.saveSelection();
        Logic.highlightActiveBlock();
    });
    UI.els.editor.addEventListener('keyup', (e) => {
        Logic.checkToolbarState();
        Logic.saveSelection();
        Logic.highlightActiveBlock();
    });

    // --- KEYBOARD MANAGER ---
    document.addEventListener('keydown', (e) => {
        // 1. CTRL + F Override
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
            e.preventDefault();
            if (!UI.isModalOpen()) {
                if (!UI.els.findBar.classList.contains('visible')) {
                    UI.toggleFind();
                } else {
                    UI.els.findInput.focus();
                    UI.els.findInput.select();
                }
            }
            return;
        }

        // 2. ESC Priority Stack (LIFO)
        if (e.key === 'Escape') {
            // Priority 1: Floating Menus
            if (document.querySelector('.floating-menu.active')) {
                UI.closeAllMenus();
                e.preventDefault();
                return;
            }
            // Priority 2: Main Modal (Overlay is on top of Search)
            if (UI.els.modalOverlay.classList.contains('visible')) {
                UI.closeModal();
                e.preventDefault();
                return;
            }
            // Priority 3: Search
            if (UI.els.findBar.classList.contains('visible')) {
                UI.toggleFind();
                e.preventDefault();
                return;
            }
            // Priority 4: Zen Mode
            if (document.body.classList.contains('zen-active')) {
                UI.toggleZen();
                e.preventDefault();
                return;
            }
            // Priority 5: Mobile Sidebar (Close if Open)
            if (UI.els.sidebar.classList.contains('active')) {
                UI.toggleSidebar();
                e.preventDefault();
                return;
            }
            // Priority 6: Settings Modal
            const settingsModal = document.getElementById('settings-modal-overlay');
            if (settingsModal && settingsModal.style.display === 'flex') {
                UI.closeSettingsModal();
                e.preventDefault();
                return;
            }
        }
    });

    // Editor Shortcuts
    UI.els.editor.addEventListener('keydown', (e) => {
        // Handle paste event for better formatting
        if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
            setTimeout(() => {
                Logic.cleanPastedContent();
            }, 0);
        }

        // Handle Shortcut Fallback on Enter (MUST run first)
        if (e.key === 'Enter') {
            Logic.handleEnterShortcuts(e);
            // If shortcut was detected, event is prevented and we return early
            if (e.defaultPrevented) return;

            // Check if we're in a heading - if so, create clean paragraph after
            const sel = window.getSelection();
            if (sel.rangeCount > 0) {
                let node = sel.anchorNode;
                if (node.nodeType === 3) node = node.parentNode;

                // Find if we're in a heading
                let current = node;
                while (current && current.id !== 'editor') {
                    if (current.tagName && ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(current.tagName)) {
                        // We're in a heading - need to ensure next line is paragraph
                        e.preventDefault();

                        // Create new paragraph
                        const p = document.createElement('p');
                        p.innerHTML = '<br>';
                        current.after(p);

                        // Move cursor to new paragraph
                        const range = document.createRange();
                        range.setStart(p, 0);
                        range.collapse(true);
                        sel.removeAllRanges();
                        sel.addRange(range);

                        return;
                    }
                    current = current.parentNode;
                }
            }
        }

        // Handle Markdown Triggers (Headings on Enter)
        Logic.handleMarkdownTriggers(e);

        // Handle List Logic (Enter & Backspace)
        if (e.key === 'Enter' || e.key === 'Backspace') {
            Logic.handleListInput(e);
        }

        // Update focus mode on Enter/Arrow keys
        if (e.key === 'Enter' || e.key.startsWith('Arrow')) {
            setTimeout(() => Logic.highlightActiveBlock(), 10);
        }

        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            document.execCommand('insertParagraph', false, null);
            document.execCommand('formatBlock', false, 'p');
            document.execCommand('removeFormat', false, null);
            document.execCommand('unlink', false, null);
            document.execCommand('styleWithCSS', false, true);
            document.execCommand('hiliteColor', false, 'transparent');
            document.execCommand('foreColor', false, '#e0e0e0');
            document.execCommand('styleWithCSS', false, false);
            document.execCommand('fontName', false, 'Fredoka');
            document.execCommand('fontSize', false, '3');
        }
    });

    // Click below content
    UI.els.container.addEventListener('click', (e) => {
        if (e.target === UI.els.container || e.target === UI.els.editor) {
            UI.els.editor.focus();
            const lastChild = UI.els.editor.lastElementChild;
            if (lastChild && (lastChild.tagName === 'PRE' || lastChild.tagName === 'DIV' || lastChild.style.backgroundColor)) {
                const p = document.createElement('p');
                p.innerHTML = '<br>';
                UI.els.editor.appendChild(p);
                const range = document.createRange();
                range.selectNodeContents(p);
                range.collapse(false);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
                Logic.saveSelection();
            }
        }
    });

    // Auto Save
    UI.els.editor.addEventListener('input', (e) => {
        Logic.handleInput(e);
        UI.checkPlaceholder();
        UI.updateStats();
        Store.save();
        Logic.saveSelection();
    });

    // Search
    UI.els.findInput.addEventListener('input', (e) => {
        Logic.performSearch(e.target.value);
    });

    UI.els.findInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            Logic.findNextMatch();
        }
    });

    // Bindings
    document.getElementById('new-note-btn').onclick = () => UI.openModal('create');
    document.getElementById('desk-delete').onclick = () => UI.openModal('delete-confirm', Store.activeId);
    document.getElementById('m-btn-delete').onclick = () => UI.openModal('delete-confirm', UI.targetId);

    UI.els.btnConfirm.onclick = () => UI.handleModalConfirm();
    UI.els.btnCancel.onclick = () => UI.closeModal();

    // Modal Enter Key Support
    if (UI.els.mInput) {
        UI.els.mInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') UI.handleModalConfirm();
        });
    }

    // PWA Install Logic
    const installBtn = document.getElementById('btn-install-sidebar');

    if (installBtn) {
        installBtn.onclick = () => Logic.installPWA();
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        Logic.deferredPrompt = e;
        if (installBtn) {
            installBtn.style.display = 'flex';
        }
    });

    window.addEventListener('appinstalled', () => {
        if (installBtn) {
            installBtn.style.display = 'none';
        }
        Logic.deferredPrompt = null;
    });
}

/* ================================
   SOURCE: Inline script from index.html
   PURPOSE: Service worker registration
   ================================ */

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('SW Registered'))
            .catch(err => console.log('SW Failed', err));
    });
}