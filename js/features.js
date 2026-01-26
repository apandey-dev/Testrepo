/* ================================
   SOURCE: js/ui.js
   PURPOSE: User interface rendering, modals, and UI interactions
   NOTE: This must be defined FIRST because other files depend on it
   ================================ */

// js/ui.js - MOVED TO TOP for proper initialization
const UI = {
    els: {},

    cacheElements: function () {
        this.els.appWrapper = document.getElementById('app-wrapper');
        this.els.authOverlay = document.getElementById('auth-overlay');
        this.els.editor = document.getElementById('editor');
        this.els.container = document.getElementById('editor-container');
        this.els.chipsBar = document.getElementById('chips-scroll-container');
        this.els.menuOverlay = document.getElementById('menu-overlay');

        // Menus
        this.els.fontBox = document.getElementById('font-box');
        this.els.colorBox = document.getElementById('color-box');
        this.els.headingBox = document.getElementById('heading-box');

        // Sidebar
        this.els.sidebar = document.getElementById('sidebar');
        this.els.sidebarOverlay = document.getElementById('sidebar-overlay');

        // Right Toolbar
        this.els.rightToolbar = document.getElementById('right-toolbar');
        this.els.toolbarOverlay = document.getElementById('toolbar-overlay');

        // Search/Find
        this.els.findBar = document.getElementById('find-bar');
        this.els.findInput = document.getElementById('find-input');

        // Stats
        this.els.statWords = document.getElementById('stat-words');
        this.els.statTime = document.getElementById('stat-time');

        // Modal
        this.els.modalOverlay = document.getElementById('modal-overlay');
        this.els.mTitle = document.getElementById('m-title');
        this.els.mMsg = document.getElementById('m-msg');
        this.els.mInput = document.getElementById('note-name-input');
        this.els.mInputView = document.getElementById('m-input-view');
        this.els.btnConfirm = document.getElementById('m-btn-confirm');
        this.els.btnCancel = document.getElementById('m-btn-cancel');
        this.els.btnDelete = document.getElementById('m-btn-delete');
        this.els.extraActions = document.getElementById('m-extra-actions');
        this.els.modalIcon = document.getElementById('modal-icon-container');

        // User Info & Buttons
        this.els.userEmailDisplay = document.getElementById('user-email-display');
        this.els.btnShare = document.getElementById('btn-share');
    },

    isModalOpen: function () {
        return this.els.modalOverlay.classList.contains('visible') ||
            (document.getElementById('settings-modal-overlay') &&
                document.getElementById('settings-modal-overlay').style.display === 'flex');
    },

    toggleSidebar: function () {
        this.els.sidebar.classList.toggle('active');
        // Toggle the background overlay too
        if (this.els.sidebarOverlay) {
            this.els.sidebarOverlay.classList.toggle('active');
        }

        // Populate email if we have it and haven't already
        if (Auth.currentUser && this.els.userEmailDisplay) {
            this.els.userEmailDisplay.innerText = Auth.currentUser.email;
        }
    },

    toggleToolbar: function () {
        if (this.els.rightToolbar) {
            this.els.rightToolbar.classList.toggle('expanded');
        }
        if (this.els.toolbarOverlay) {
            this.els.toolbarOverlay.classList.toggle('active');
        }
    },

    togglePinFilter: function () {
        document.body.classList.toggle('pinned-view');
        const btn = document.getElementById('pin-filter-btn');
        if (btn) {
            btn.classList.toggle('active');
        }
        this.renderChips();
    },

    // --- Date Helpers ---
    isToday: function (d) {
        const today = new Date();
        return d.getDate() === today.getDate() &&
            d.getMonth() === today.getMonth() &&
            d.getFullYear() === today.getFullYear();
    },

    isYesterday: function (d) {
        const y = new Date();
        y.setDate(y.getDate() - 1);
        return d.getDate() === y.getDate() &&
            d.getMonth() === y.getMonth() &&
            d.getFullYear() === y.getFullYear();
    },

    formatDateGroup: function (d) {
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    },

    // Render only top 8 notes modified TODAY (or pinned notes if in pinned view)
    renderChips: function () {
        this.els.chipsBar.innerHTML = "";

        const notes = Store.getFilteredNotes();

        // Check if we're in pinned-view mode
        const isPinnedView = document.body.classList.contains('pinned-view');

        let finalNotes;

        if (isPinnedView) {
            // Pinned View: Show only pinned notes from last 4-5 days
            const daysAgo = new Date();
            daysAgo.setDate(daysAgo.getDate() - 5);

            const recentPinned = notes.filter(n => {
                if (!n.is_pinned) return false;
                const d = new Date(n.updated_at || n.created_at || Date.now());
                return d >= daysAgo;
            });

            // Sort by pin order
            recentPinned.sort((a, b) => {
                return Store.getPinnedIndex(a.id) - Store.getPinnedIndex(b.id);
            });

            finalNotes = recentPinned.slice(0, 8);

            // Handle empty state
            if (finalNotes.length === 0) {
                const emptyChip = document.createElement('div');
                emptyChip.className = 'chip chip-empty';
                emptyChip.textContent = 'No pinned notes';
                emptyChip.style.opacity = '0.5';
                emptyChip.style.cursor = 'default';
                this.els.chipsBar.appendChild(emptyChip);
                return;
            }
        } else {
            // Normal View: Only notes from TODAY
            const recentNotes = notes.filter(n => {
                const d = new Date(n.updated_at || n.created_at || Date.now());
                return this.isToday(d);
            });

            // Split into Pinned and Unpinned
            let unpinned = recentNotes.filter(n => !n.is_pinned);
            let pinned = recentNotes.filter(n => n.is_pinned);

            // Sort Pinned by pin order
            pinned.sort((a, b) => {
                return Store.getPinnedIndex(a.id) - Store.getPinnedIndex(b.id);
            });

            // Combine: Unpinned FIRST, then Pinned at END
            finalNotes = [...unpinned, ...pinned].slice(0, 8);
        }

        finalNotes.forEach(note => {
            const chip = document.createElement('div');
            chip.className = "chip";
            chip.id = `chip-${note.id}`;
            if (note.id == Store.activeId) chip.classList.add("active");

            // Add 'pinned' class for visual indication
            if (note.is_pinned) {
                chip.classList.add('pinned');
            }

            // Check unsaved
            if (Store.unsavedId === note.id) {
                chip.classList.add('unsaved');
            }

            // Truncate title to 2 words + '..'
            let displayTitle = note.title || "Untitled";
            const words = displayTitle.split(' ');
            if (words.length > 2) {
                displayTitle = words.slice(0, 2).join(' ') + '..';
            }

            const textNode = document.createTextNode(displayTitle);
            chip.appendChild(textNode);

            chip.onclick = () => Logic.switchNote(note.id);

            // Right-click context menu
            chip.oncontextmenu = (e) => {
                e.preventDefault();
                UI.showChipContextMenu(e, note.id);
            };

            this.els.chipsBar.appendChild(chip);
        });

        // Update pin button state
        if (typeof Logic !== 'undefined' && Logic.updatePinButton) {
            Logic.updatePinButton();
        }

        // Also render notes list in sidebar
        this.renderNotesList();
    },

    showChipContextMenu: function (e, noteId) {
        const menu = document.getElementById('chip-context-menu');
        if (!menu) return;

        menu.style.display = 'block';
        menu.style.left = e.pageX + 'px';
        menu.style.top = e.pageY + 'px';
        menu.dataset.noteId = noteId;

        setTimeout(() => {
            document.addEventListener('click', () => this.hideChipContextMenu(), { once: true });
        }, 10);
    },

    hideChipContextMenu: function () {
        const menu = document.getElementById('chip-context-menu');
        if (menu) {
            menu.style.display = 'none';
            delete menu.dataset.noteId;
        }
    },

    handleChipContextAction: function (action, noteId) {
        this.hideChipContextMenu();

        const note = Store.notes.find(n => n.id === noteId);
        if (!note) {
            console.error('Note not found:', noteId);
            return;
        }

        // Set as active note before any action (important for modal operations)
        const wasActive = Store.activeId === noteId;
        if (!wasActive) {
            Store.activeId = noteId;
            this.loadNoteContent();
        }

        switch (action) {
            case 'rename':
                this.showRenameModal(noteId, note.title);
                break;

            case 'pin':
                const newStatus = !note.is_pinned;
                Store.togglePinStatus(noteId, newStatus).then(() => {
                    this.renderChips();
                    this.renderNotesList();
                });
                break;

            case 'export':
                // Trigger existing export modal
                this.openModal('export');
                break;

            case 'share':
                // Trigger existing share modal
                this.openModal('share');
                break;

            case 'delete':
                this.showDeleteConfirm(noteId, note.title);
                break;
        }
    },

    showDeleteConfirm: function (noteId, noteTitle) {
        const overlay = document.getElementById('delete-confirm-overlay');
        const titleEl = document.getElementById('delete-note-title');
        const confirmBtn = document.getElementById('delete-confirm-btn');
        const cancelBtn = document.getElementById('delete-cancel-btn');

        if (!overlay || !titleEl || !confirmBtn || !cancelBtn) return;

        titleEl.textContent = noteTitle || 'Untitled';
        overlay.style.display = 'flex';

        // Remove old listeners
        const newConfirmBtn = confirmBtn.cloneNode(true);
        const newCancelBtn = cancelBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

        // Cancel handler
        newCancelBtn.onclick = () => {
            overlay.style.display = 'none';
        };

        // Confirm handler
        newConfirmBtn.onclick = () => {
            overlay.style.display = 'none';
            Store.deleteNote(noteId).then(() => {
                this.renderChips();
                this.renderNotesList();
                this.loadNoteContent();
            });
        };

        // Click outside to close
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                overlay.style.display = 'none';
            }
        };
    },

    showRenameModal: function (noteId, currentTitle) {
        const overlay = document.getElementById('rename-modal-overlay');
        const input = document.getElementById('rename-note-input');
        const confirmBtn = document.getElementById('rename-confirm-btn');
        const cancelBtn = document.getElementById('rename-cancel-btn');

        if (!overlay || !input || !confirmBtn || !cancelBtn) return;

        input.value = currentTitle || '';
        overlay.style.display = 'flex';

        // Focus input and select text
        setTimeout(() => {
            input.focus();
            input.select();
        }, 100);

        // Remove old listeners
        const newConfirmBtn = confirmBtn.cloneNode(true);
        const newCancelBtn = cancelBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

        // Cancel handler
        newCancelBtn.onclick = () => {
            overlay.style.display = 'none';
        };

        // Confirm handler
        newConfirmBtn.onclick = () => {
            const newTitle = input.value.trim();
            if (newTitle && newTitle !== currentTitle) {
                overlay.style.display = 'none';
                Store.updateTitle(noteId, newTitle).then(() => {
                    this.renderChips();
                    this.renderNotesList();
                });
            } else {
                overlay.style.display = 'none';
            }
        };

        // Enter key to confirm
        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                newConfirmBtn.click();
            } else if (e.key === 'Escape') {
                overlay.style.display = 'none';
            }
        };

        // Click outside to close
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                overlay.style.display = 'none';
            }
        };
    },

    setUnsaved: function (id, isUnsaved) {
        const chip = document.getElementById(`chip-${id}`);
        if (chip) {
            if (isUnsaved) chip.classList.add('unsaved');
            else chip.classList.remove('unsaved');
        }
    },

    // Render all notes in sidebar with Date Grouping
    renderNotesList: function () {
        const notesList = document.getElementById('notes-list');
        if (!notesList) return;

        notesList.innerHTML = "";
        const notes = Store.getFilteredNotes();

        let currentGroup = null;

        notes.forEach(note => {
            // Determine Group
            const date = new Date(note.updated_at || note.created_at || Date.now());
            let group = "";

            if (this.isToday(date)) group = "Today";
            else if (this.isYesterday(date)) group = "Yesterday";
            else group = this.formatDateGroup(date);

            // Render Header if group changes
            if (group !== currentGroup) {
                const header = document.createElement('div');
                header.className = 'sidebar-date-header';
                header.innerText = group;
                notesList.appendChild(header);
                currentGroup = group;
            }

            // Render Note Item
            const item = document.createElement('div');
            item.className = "note-item";
            if (note.id == Store.activeId) item.classList.add("active");
            if (note.is_pinned) item.classList.add("pinned");

            item.innerHTML = `
                <i class="ph ${note.is_pinned ? 'ph-push-pin' : 'ph-note'}"></i>
                <span class="note-title">${note.title}</span>
            `;

            item.onclick = () => {
                Logic.switchNote(note.id);
                // Close sidebar on mobile after selecting
                if (window.innerWidth < 769) {
                    UI.toggleSidebar();
                }
            };

            notesList.appendChild(item);
        });
    },

    loadNoteContent: function () {
        const n = Store.getActiveNote();
        Logic.clearSearch();
        this.els.editor.innerHTML = n ? n.content : "";
        this.updateStats();
        this.checkPlaceholder();

        this.els.editor.classList.remove('focus-mode-active');
        const focusBtn = document.getElementById('btn-focus');
        if (focusBtn) focusBtn.classList.remove('active');
    },

    updateStats: function () {
        const txt = this.els.editor.innerText.trim();
        const wc = txt ? txt.split(/\s+/).length : 0;
        this.els.statWords.innerText = `${wc} words`;
        this.els.statTime.innerText = `${Math.ceil(wc / 200)}m read`;
    },

    checkPlaceholder: function () {
        const content = this.els.editor.innerText.replace(/\u200B/g, '').trim();
        const hasImg = this.els.editor.querySelector('img') !== null;
        const hasSvg = this.els.editor.querySelector('svg') !== null;
        const isEmpty = content.length === 0 && !hasImg && !hasSvg;
        this.els.editor.setAttribute('data-empty', isEmpty);
        if (isEmpty && this.els.editor.innerHTML !== "") {
            this.els.editor.innerHTML = "";
        }
    },

    toggleZen: function () {
        document.body.classList.toggle('zen-active');
    },

    toggleFocusMode: function () {
        this.els.editor.classList.toggle('focus-mode-active');
        const btn = document.getElementById('btn-focus');
        if (btn) btn.classList.toggle('active');

        if (this.els.editor.classList.contains('focus-mode-active')) {
            Logic.highlightActiveBlock();
        }
    },

    toggleFind: function () {
        const isVisible = this.els.findBar.classList.contains('visible');
        if (isVisible) {
            this.els.findBar.classList.remove('visible');
            Logic.clearSearch();
            this.els.editor.focus();
        } else {
            this.els.findBar.classList.add('visible');
            this.els.findInput.value = '';
            this.els.findInput.focus();
        }
    },

    toggleMenu: function (type) {
        // Ensure elements are cached
        if (!this.els.fontBox || !this.els.colorBox) this.cacheElements();

        let target, btnId;
        if (type === 'font') { target = this.els.fontBox; btnId = 'btn-font'; }
        else if (type === 'color') { target = this.els.colorBox; btnId = 'btn-color'; }
        else if (type === 'heading') { target = this.els.headingBox; btnId = 'btn-heading'; }

        const isVisible = target.classList.contains('active');
        this.closeAllMenus();

        if (!isVisible) {
            this.els.menuOverlay.style.display = 'block';

            const btn = document.getElementById(btnId);
            if (btn) {
                const rect = btn.getBoundingClientRect();
                let left = rect.left;

                if (left + 220 > window.innerWidth) {
                    left = window.innerWidth - 230;
                }

                target.style.top = (rect.bottom + 12) + 'px';
                target.style.left = left + 'px';
            }

            void target.offsetWidth;
            target.classList.add('active');
        }
    },

    closeAllMenus: function () {
        [this.els.fontBox, this.els.colorBox, this.els.headingBox].forEach(el => el && el.classList.remove('active'));
        setTimeout(() => {
            if (!document.querySelector('.floating-menu.active')) this.els.menuOverlay.style.display = 'none';
        }, 200);
    },

    // Modal Logic
    currentModalMode: null,
    targetId: null,
    modalCallback: null,

    openModal: function (mode, titleOrId, msgOrLabel = null, callback = null) {
        if (mode === 'settings') {
            SettingsUI.toggleModal(true);
            return;
        }

        this.currentModalMode = mode;
        this.modalCallback = callback;

        // Reset Defaults
        this.els.modalOverlay.style.display = 'flex';
        requestAnimationFrame(() => this.els.modalOverlay.classList.add('visible'));

        // Hide all specifics initially
        this.els.mInputView.style.display = 'none';
        this.els.extraActions.style.display = 'none';
        this.els.mMsg.style.display = 'none';
        this.els.modalIcon.style.display = 'none';
        this.els.modalIcon.innerHTML = '';

        this.els.btnConfirm.innerText = "OK";
        this.els.btnConfirm.className = "m-btn btn-primary";
        this.els.btnCancel.style.display = "block";

        if (mode === 'create') {
            this.targetId = null;
            this.els.mTitle.innerText = "New Page";
            this.els.mInputView.style.display = 'block';
            this.els.mInput.placeholder = "Page Name";
            this.els.mInput.value = "";
            setTimeout(() => this.els.mInput.focus(), 100);
            this.els.btnConfirm.innerText = "Create";

        } else if (mode === 'input') {
            this.els.mTitle.innerText = titleOrId;
            this.els.mInputView.style.display = 'block';
            this.els.mInput.placeholder = msgOrLabel || "Enter value...";
            this.els.mInput.value = "";
            setTimeout(() => this.els.mInput.focus(), 100);
            this.els.btnConfirm.innerText = "Confirm";

        } else if (mode === 'edit-note') {
            this.targetId = titleOrId || Store.activeId;
            const n = Store.notes.find(x => x.id == this.targetId);
            this.els.mTitle.innerText = "Edit Note";
            this.els.mInputView.style.display = 'block';
            this.els.mInput.value = n ? n.title : "";
            this.els.mInput.placeholder = "Note Name";
            setTimeout(() => this.els.mInput.focus(), 100);

            this.els.btnConfirm.innerText = "Save";
            if (window.innerWidth < 769) this.els.extraActions.style.display = 'flex';

        } else if (mode === 'edit') {
            this.targetId = titleOrId || Store.activeId;
            const n = Store.notes.find(x => x.id == this.targetId);
            this.els.mTitle.innerText = "Edit Page";
            this.els.mInputView.style.display = 'block';
            this.els.mInput.value = n ? n.title : "";
            this.els.btnConfirm.innerText = "Save Name";
            if (window.innerWidth < 769) this.els.extraActions.style.display = 'flex';

        } else if (mode === 'delete-confirm') {
            this.targetId = titleOrId || Store.activeId;
            this.els.modalIcon.style.display = 'flex';
            this.els.modalIcon.innerHTML = '<div class="confirm-icon-wrapper"><i class="ph ph-warning-octagon"></i></div>';

            this.els.mTitle.innerText = "Delete Page?";
            this.els.mMsg.style.display = 'block';
            this.els.mMsg.innerText = typeof msgOrLabel === 'string' ? msgOrLabel : "Are you sure? This cannot be undone.";

            this.els.btnConfirm.innerText = "Delete";
            this.els.btnConfirm.className = "m-btn btn-danger";

        } else if (mode === 'logout') {
            this.els.mTitle.innerText = "Log Out";
            this.els.mMsg.style.display = 'block';
            this.els.mMsg.innerText = "Are you sure you want to log out?";
            this.els.btnConfirm.innerText = "Log Out";
            this.els.btnConfirm.className = "m-btn btn-primary";
            this.els.modalIcon.style.display = 'flex';
            this.els.modalIcon.innerHTML = '<div class="confirm-icon-wrapper" style="background: #222; border-color: #333; color: #fff;"><i class="ph ph-sign-out"></i></div>';

        } else if (mode === 'share') {
            // --- SHARE MODAL ---
            this.targetId = Store.activeId;
            const note = Store.getActiveNote();
            const isPublic = note ? note.is_public : false;
            const link = `https://apandey-focuspad.vercel.app/share.html?id=${this.targetId}`;

            this.els.mTitle.innerText = "Share Note";
            this.els.mMsg.style.display = 'block';

            this.els.mMsg.innerHTML = `
                <div class="share-container">
                    <div class="share-row">
                        <div>
                            <div class="share-label">Public Access</div>
                            <div class="share-sub">Anyone with the link can view</div>
                        </div>
                        <div class="share-toggle-wrapper">
                            <input type="checkbox" id="share-toggle" class="segment-input" ${isPublic ? 'checked' : ''} onchange="Logic.toggleShare(this.checked)">
                            <label for="share-toggle" class="segment-label">
                                <span class="segment-text option-private">Private</span>
                                <span class="segment-text option-public">Public</span>
                                <span class="segment-pill"></span>
                            </label>
                        </div>
                    </div>
                    <div class="link-box ${isPublic ? 'active' : ''}" id="share-link-box">
                        <input type="text" class="link-input" value="${link}" readonly>
                        <button id="btn-copy" onclick="Logic.copyShareLink()">Copy</button>
                    </div>
                </div>
            `;

            this.els.btnConfirm.innerText = "Done";
            this.els.btnCancel.style.display = "none";

        } else if (mode === 'export') {
            this.targetId = Store.activeId;
            const note = Store.getActiveNote();

            this.els.mTitle.innerText = "Export Note";
            this.els.mMsg.style.display = 'block';
            this.els.mMsg.innerHTML = `
                <div class="export-options">
                    <button class="export-option-btn" onclick="Logic.exportNote('pdf')">
                        <i class="ph ph-file-pdf"></i>
                        <div>
                            <div class="export-title">PDF Document</div>
                            <div class="export-desc">Print-ready format with styling</div>
                        </div>
                    </button>
                    <button class="export-option-btn" onclick="Logic.exportNote('markdown')">
                        <i class="ph ph-file-text"></i>
                        <div>
                            <div class="export-title">Markdown</div>
                            <div class="export-desc">Plain text with formatting</div>
                        </div>
                    </button>
                    <button class="export-option-btn" onclick="Logic.exportNote('text')">
                        <i class="ph ph-file"></i>
                        <div>
                            <div class="export-title">Plain Text</div>
                            <div class="export-desc">No formatting, just text</div>
                        </div>
                    </button>
                </div>
            `;

            this.els.btnConfirm.innerText = "Close";
            this.els.btnCancel.style.display = "none";

        } else if (mode === 'settings') {
            SettingsUI.toggleModal(true);
        }
    },

    closeModal: function () {
        this.els.modalOverlay.classList.remove('visible');
        setTimeout(() => { this.els.modalOverlay.style.display = 'none'; this.els.editor.focus(); }, 250);
        this.modalCallback = null;
    },

    handleModalConfirm: async function () {
        const val = this.els.mInput.value.trim();
        let success = true;

        if (this.currentModalMode === 'input' && this.modalCallback) {
            const result = await this.modalCallback(val);
            if (result === false) success = false;
        } else if (this.currentModalMode === 'create') {
            console.log('handleModalConfirm: create mode, calling Store.createNote with:', val || "Untitled");
            const newId = await Store.createNote(val || "Untitled");
            console.log('handleModalConfirm: createNote returned:', newId);
            if (newId) {
                console.log('handleModalConfirm: rendering chips and loading content');
                this.renderChips();
                this.loadNoteContent();
            } else {
                console.error('handleModalConfirm: createNote failed, no new ID returned');
                success = false;
            }
        } else if (this.currentModalMode === 'edit') {
            await Store.updateTitle(this.targetId, val || "Untitled");
            this.renderChips();
        } else if (this.currentModalMode === 'edit-note') {
            await Store.updateTitle(this.targetId, val || "Untitled");
            this.renderChips();
            this.loadNoteContent();
        } else if (this.currentModalMode === 'delete-confirm') {
            if (this.modalCallback) {
                await this.modalCallback();
            } else {
                await Store.deleteNote(this.targetId);
                this.renderChips();
                this.loadNoteContent();
            }
        } else if (this.currentModalMode === 'logout') {
            if (this.modalCallback) await this.modalCallback();
        } else if (this.currentModalMode === 'share') {
            success = true; // Just close
        } else if (this.currentModalMode === 'export') {
            success = true; // Just close
        }

        if (success) {
            this.closeModal();
        }
    }
};

/* ================================
   SOURCE: js/settings-ui.js
   PURPOSE: Premium Settings Modal Logic
   ================================ */
const SettingsUI = {
    toggleModal: function (show) {
        const overlay = document.getElementById('settings-modal-overlay');
        if (!overlay) return;

        if (show) {
            this.init(); // Sync state before showing
            overlay.style.display = 'flex';
            // Force reflow
            void overlay.offsetWidth;
            overlay.classList.add('visible');
        } else {
            overlay.classList.remove('visible');
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 300);
        }
    },

    init: function () {
        // 1. Restore Theme
        const storedTheme = localStorage.getItem('theme') || 'dark';
        this.setTheme(storedTheme, false);

        // 2. Initialize Dropdown Listeners (Once)
        if (!this.listenersInitialized) {
            this.initDropdownListeners();
            this.listenersInitialized = true;
        }
    },

    setTheme: function (theme, save = true) {
        document.body.setAttribute('data-theme', theme);
        const control = document.getElementById('themeControl');
        if (control) control.setAttribute('data-state', theme);
        if (save) localStorage.setItem('theme', theme);
    },

    setFont: function (fontKey, element) {
        this.updateDropdownUI(element);

        const fontMap = {
            'playpen': 'Playpen Sans',
            'kalam': 'Kalam',
            'fredoka': 'Fredoka'
        };
        const font = fontMap[fontKey] || fontKey;

        // Apply globally to editor via inline style (affecting default)
        const editor = document.getElementById('editor');
        if (editor) {
            editor.style.fontFamily = `"${font}", cursive`;
            // Also update the CSS variable for good measure
            document.documentElement.style.setProperty('--editor-font', font);
            // Save preference
            localStorage.setItem('editorFont', font);
        }
    },

    setFontSize: function (size, element) {
        this.updateDropdownUI(element);

        const editor = document.getElementById('editor');
        if (editor) {
            editor.style.fontSize = `${size}px`;
            localStorage.setItem('editorFontSize', size);
        }
    },



    updateDropdownUI: function (element) {
        const dropdown = element.closest('.custom-dropdown');
        const triggerText = dropdown.querySelector('.selected-text');
        const options = dropdown.querySelectorAll('.option');

        options.forEach(opt => opt.classList.remove('selected'));
        element.classList.add('selected');

        // Update text
        // Clone contents to keep any icons in trigger if we wanted, 
        // but for now just text is fine or copy HTML minus the check icon
        if (triggerText) {
            // Extract text only from the option (ignoring SVG)
            triggerText.innerText = element.innerText.trim();
            // If it's the font dropdown, also update the font-family of the trigger text
            if (element.style.fontFamily) {
                triggerText.style.fontFamily = element.style.fontFamily;
            }
        }

        dropdown.classList.remove('open');
    },

    initDropdownListeners: function () {
        const dropdowns = document.querySelectorAll('.custom-dropdown');

        dropdowns.forEach(dropdown => {
            const trigger = dropdown.querySelector('.dropdown-trigger');

            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                // Close others
                dropdowns.forEach(d => {
                    if (d !== dropdown) d.classList.remove('open');
                });
                dropdown.classList.toggle('open');
            });
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.custom-dropdown')) {
                dropdowns.forEach(d => d.classList.remove('open'));
            }
        });
    }
};

/* ================================
   SOURCE: js/pin-filter.js
   PURPOSE: Pin filter toggle functionality
   NOTE: Must come AFTER UI is defined
   ================================ */

// Pin Filter Toggle - Attach to existing UI object
UI.togglePinFilter = function () {
    document.body.classList.toggle('pinned-view');
    const btn = document.getElementById('pin-filter-btn');
    if (btn) {
        btn.classList.toggle('active');
    }
    this.renderChips();
};

// Methods moved to UI object definition above

// Initialize context menu clicks (will run when DOM is ready)
document.addEventListener('DOMContentLoaded', () => {
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
});

/* ================================
   SOURCE: js/mobile-mode.js
   PURPOSE: Mobile device detection and read-only mode
   ================================ */

// Mobile device detection and read-only mode
const MobileMode = {
    isMobile: function () {
        return window.innerWidth <= 768 || /Mobile|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    },

    init: function () {
        if (!this.isMobile()) return;

        // Make editor read-only
        const editor = document.getElementById('editor');
        if (editor) {
            editor.contentEditable = 'false';
            editor.style.cursor = 'default';
            editor.style.userSelect = 'text'; // Allow selection for copy
        }

        // Hide sidebar and toolbars
        document.body.classList.add('mobile-mode');

        // Double-tap handler for print menu
        this.initDoubleTapPrint();
    },

    initDoubleTapPrint: function () {
        const chipsBar = document.getElementById('chips-scroll-container');
        if (!chipsBar) return;

        let lastTap = 0;
        let lastTappedChip = null;

        chipsBar.addEventListener('touchend', (e) => {
            const chip = e.target.closest('.chip');
            if (!chip) return;

            const noteId = chip.id.replace('chip-', '');
            const currentTime = new Date().getTime();
            const tapGap = currentTime - lastTap;

            if (tapGap < 300 && tapGap > 0 && lastTappedChip === chip) {
                // Double tap detected
                e.preventDefault();
                this.showPrintMenu(noteId, e.changedTouches[0].clientX, e.changedTouches[0].clientY);
            }

            lastTap = currentTime;
            lastTappedChip = chip;
        });
    },

    showPrintMenu: function (noteId, x, y) {
        // Remove existing menu if any
        const existing = document.getElementById('mobile-print-menu');
        if (existing) existing.remove();

        const menu = document.createElement('div');
        menu.id = 'mobile-print-menu';
        menu.className = 'mobile-print-menu';
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';

        const printItem = document.createElement('div');
        printItem.className = 'mobile-menu-item';
        printItem.innerHTML = '<i class="ph ph-printer"></i><span>Print Note</span>';
        printItem.onclick = () => {
            menu.remove();
            // Set note as active and trigger print
            Store.activeId = noteId;
            UI.loadNoteContent();
            setTimeout(() => UI.openModal('export'), 100);
        };

        menu.appendChild(printItem);
        document.body.appendChild(menu);

        // Close on outside tap
        setTimeout(() => {
            document.addEventListener('touchend', function closeMenu(e) {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('touchend', closeMenu);
                }
            });
        }, 100);
    }
};

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => MobileMode.init());
} else {
    MobileMode.init();
}

/* ================================
   SOURCE: js/logic.js
   PURPOSE: Editor logic, formatting, search, and export features
   ================================ */

// js/logic.js
const Logic = {
    lastSelectionRange: null,

    saveSelection: function () {
        const sel = window.getSelection();
        if (sel.rangeCount > 0 && UI.els.editor.contains(sel.anchorNode)) {
            this.lastSelectionRange = sel.getRangeAt(0).cloneRange();
        }
    },

    restoreSelection: function () {
        if (this.lastSelectionRange) {
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(this.lastSelectionRange);
        }
    },

    // --- Focus Mode Logic ---
    highlightActiveBlock: function () {
        if (!UI.els.editor.classList.contains('focus-mode-active')) return;

        const sel = window.getSelection();
        if (!sel.rangeCount) return;

        let node = sel.anchorNode;
        if (node.nodeType === 3) node = node.parentNode;

        while (node && node.parentNode !== UI.els.editor && node !== UI.els.editor) {
            node = node.parentNode;
        }

        const existing = UI.els.editor.querySelectorAll('.focused-block');
        existing.forEach(el => el.classList.remove('focused-block'));

        if (node && node !== UI.els.editor && node.parentNode === UI.els.editor) {
            node.classList.add('focused-block');
        }
    },

    // --- Share Logic ---
    toggleShare: async function (checked) {
        const linkBox = document.getElementById('share-link-box');
        if (checked) linkBox.classList.add('active');
        else linkBox.classList.remove('active');
        await Store.togglePublicStatus(Store.activeId, checked);
    },

    copyShareLink: function () {
        const input = document.querySelector('.link-input');
        input.select();
        document.execCommand('copy');
        navigator.clipboard.writeText(input.value);
        const btn = document.getElementById('btn-copy');
        btn.innerText = "Copied!";
        setTimeout(() => btn.innerText = "Copy", 1500);
    },

    // --- Pin/Unpin Logic ---
    togglePinNote: async function () {
        const note = Store.getActiveNote();
        if (!note) {
            console.log('No active note found');
            return;
        }

        console.log('Current note:', note.title, 'is_pinned:', note.is_pinned);
        const newPinStatus = !note.is_pinned;
        console.log('Toggling to:', newPinStatus);

        const result = await Store.togglePinStatus(Store.activeId, newPinStatus);
        console.log('Toggle result:', result);

        UI.renderChips();
        this.updatePinButton();
    },

    updatePinButton: function () {
        const note = Store.getActiveNote();
        const btn = document.getElementById('btn-pin');
        const text = document.getElementById('pin-text');

        if (note && note.is_pinned) {
            if (text) text.innerText = 'Pinned';
            if (btn) btn.style.opacity = '1';
        } else {
            if (text) text.innerText = 'Pin';
            if (btn) btn.style.opacity = '0.7';
        }
    },

    // --- Export Logic ---
    exportNote: function (format) {
        const note = Store.getActiveNote();
        if (!note) return;

        const filename = `${note.title.replace(/[^a-z0-9]/gi, '_')}`;

        if (format === 'pdf') {
            // UX IMPROVEMENT: Show loading state
            const btns = document.querySelectorAll('.export-option-btn');
            let pdfBtn = null;
            btns.forEach(b => {
                if (b.innerText.includes('PDF')) pdfBtn = b;
            });

            if (pdfBtn) {
                // Prevent double clicks
                if (pdfBtn.disabled) return;

                const originalHTML = pdfBtn.innerHTML;
                pdfBtn.style.opacity = '0.7';
                pdfBtn.style.cursor = 'wait';
                pdfBtn.disabled = true;

                // Show clear loading indicator
                pdfBtn.innerHTML = `
                    <i class="ph ph-spinner ph-spin"></i>
                    <div>
                        <div class="export-title">Generating PDF...</div>
                        <div class="export-desc">Please wait</div>
                    </div>
                `;

                // Defer the heavy lifting to allow UI to update
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        try {
                            this.exportToPDF(note, () => {
                                // Callback after export window opens
                                pdfBtn.innerHTML = originalHTML;
                                pdfBtn.style.opacity = '1';
                                pdfBtn.style.cursor = 'pointer';
                                pdfBtn.disabled = false;
                                UI.closeModal();
                            });
                        } catch (e) {
                            console.error('Export failed', e);
                            pdfBtn.innerHTML = `<i class="ph ph-warning"></i> Error`;
                            setTimeout(() => {
                                pdfBtn.innerHTML = originalHTML;
                                pdfBtn.style.opacity = '1';
                                pdfBtn.style.cursor = 'pointer';
                                pdfBtn.disabled = false;
                            }, 2000);
                        }
                    }, 50); // Small delay to ensure render
                });
            } else {
                // Fallback if button not found (rare)
                this.exportToPDF(note);
                UI.closeModal();
            }
        } else if (format === 'markdown') {
            this.exportToMarkdown(note, filename);
            UI.closeModal();
        } else if (format === 'text') {
            this.exportToText(note, filename);
            UI.closeModal();
        }
    },

    exportToPDF: function (note, onComplete) {
        const editor = document.getElementById('editor');
        if (!editor) {
            console.error('Editor not found');
            if (onComplete) onComplete();
            return;
        }

        // Update the dynamic print style with A2 portrait and zero margins
        const printStyle = document.getElementById('print-page-style');
        if (printStyle) {
            printStyle.textContent = `
                @media print {
                    @page {
                        size: A2 portrait;
                        margin: 0;
                    }
                }
            `;
        }

        // Small delay to ensure styles are applied before print dialog opens
        setTimeout(() => {
            window.print();
            // Call completion callback after print dialog closes
            if (onComplete) onComplete();
        }, 100);
    },

    exportToMarkdown: function (note, filename) {
        let markdown = `# ${note.title}\n\n`;
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = note.content;

        markdown += this.htmlToMarkdown(tempDiv);

        this.downloadFile(markdown, `${filename}.md`, 'text/markdown');
    },

    exportToText: function (note, filename) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = note.content;
        const text = `${note.title}\n\n${tempDiv.innerText}`;

        this.downloadFile(text, `${filename}.txt`, 'text/plain');
    },

    htmlToMarkdown: function (element) {
        let markdown = '';

        element.childNodes.forEach(node => {
            if (node.nodeType === 3) {
                markdown += node.textContent;
            } else if (node.nodeType === 1) {
                const tag = node.tagName.toLowerCase();

                if (tag === 'h1') markdown += `# ${node.innerText}\n\n`;
                else if (tag === 'h2') markdown += `## ${node.innerText}\n\n`;
                else if (tag === 'h3') markdown += `### ${node.innerText}\n\n`;
                else if (tag === 'p') markdown += `${node.innerText}\n\n`;
                else if (tag === 'strong' || tag === 'b') markdown += `**${node.innerText}**`;
                else if (tag === 'em' || tag === 'i') markdown += `*${node.innerText}*`;
                else if (tag === 'u') markdown += `__${node.innerText}__`;
                else if (tag === 'ul') {
                    node.querySelectorAll('li').forEach(li => {
                        markdown += `- ${li.innerText}\n`;
                    });
                    markdown += '\n';
                } else if (tag === 'ol') {
                    node.querySelectorAll('li').forEach((li, i) => {
                        markdown += `${i + 1}. ${li.innerText}\n`;
                    });
                    markdown += '\n';
                } else if (tag === 'pre' || tag === 'code') {
                    markdown += `\`\`\`\n${node.innerText}\n\`\`\`\n\n`;
                } else if (tag === 'br') {
                    markdown += '\n';
                } else {
                    markdown += this.htmlToMarkdown(node);
                }
            }
        });

        return markdown;
    },

    downloadFile: function (content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    switchNote: function (id) {
        Store.saveImmediate();
        Store.activeId = id;
        UI.renderChips();
        UI.loadNoteContent();
        UI.updateStats();
    },

    // --- Formatting ---
    restoreSelection: function () {
        UI.els.editor.focus();
        if (this.lastSelectionRange) {
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(this.lastSelectionRange);
        }
    },

    checkToolbarState: function () {
        const commands = [
            'bold', 'italic', 'underline',
            'insertUnorderedList', 'insertOrderedList',
            'justifyLeft', 'justifyCenter', 'justifyRight'
        ];

        commands.forEach(cmd => {
            let btnId;
            if (cmd === 'insertUnorderedList') btnId = 'btn-ul';
            else if (cmd === 'insertOrderedList') btnId = 'btn-ol';
            else if (cmd.startsWith('justify')) btnId = 'btn-' + cmd;
            else btnId = 'btn-' + cmd;

            const btn = document.getElementById(btnId);
            try {
                if (btn) {
                    if (document.queryCommandState(cmd)) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                }
            } catch (e) { }
        });

        try {
            const color = document.queryCommandValue('foreColor');
            this.updateColorIndicator(color);
        } catch (e) { }
    },

    updateColorIndicator: function (colorName) {
        const indicator = document.getElementById('color-indicator');
        if (!indicator) return;

        // Use variable for indicator
        if (colorName) {
            const validThemeColors = ['neutral', 'red', 'orange', 'green', 'blue', 'purple'];
            if (validThemeColors.includes(colorName)) {
                indicator.style.backgroundColor = `var(--color-${colorName})`;
            } else {
                indicator.style.backgroundColor = colorName;
            }
            indicator.style.display = 'block';
        } else {
            indicator.style.display = 'none';
        }
    },

    formatText: function (cmd, value = null) {
        document.execCommand(cmd, false, value);
        this.checkToolbarState();
        document.getElementById('editor').focus();
    },

    formatHeading: function (tag) {
        document.execCommand('formatBlock', false, tag);
        this.checkToolbarState();
    },

    setTextColor: function (colorName) {
        this.restoreSelection();

        // 1. Theme Colors (Class-based)
        const validThemeColors = ['neutral', 'red', 'orange', 'green', 'blue', 'purple'];
        const isThemeColor = validThemeColors.includes(colorName);

        const sel = window.getSelection();
        if (!sel.rangeCount) return;
        const range = sel.getRangeAt(0);

        if (range.collapsed) {
            // Cursor Only: Insert colored span with ZWS
            const span = document.createElement('span');

            if (isThemeColor) {
                span.className = `text-${colorName}`;
            } else {
                // Universal Color (Inline Style)
                // Only apply if it's a valid color? Browser handles invalid styles gracefully (ignores them)
                // We can try setting it and see if it sticks, but for now just setting it is enough.
                span.style.color = colorName;
                // Check if valid?
                if (span.style.color === '') {
                    // Invalid color, abort
                    return;
                }
            }

            span.innerHTML = '&#8203;'; // Zero-width space
            range.insertNode(span);

            // Move cursor inside
            const newRange = document.createRange();
            newRange.setStart(span.firstChild, 1); // After ZWS
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
        } else {
            // Selection: Wrap text
            try {
                const span = document.createElement('span');

                if (isThemeColor) {
                    span.className = `text-${colorName}`;
                } else {
                    span.style.color = colorName;
                    if (span.style.color === '') return; // Invalid
                }

                try {
                    range.surroundContents(span);
                } catch (e) {
                    const content = range.extractContents();
                    span.appendChild(content);
                    range.insertNode(span);
                }
            } catch (err) {
                console.error("Color wrap failed", err);
            }
        }

        UI.closeAllMenus();
        Store.save();
        this.updateColorIndicator(colorName);
    },

    setFont: function (fontName) {
        if (!document.getElementById('font-box').classList.contains('active')) return;
        this.restoreSelection();
        document.execCommand('fontName', false, fontName);
        UI.closeAllMenus();
        Store.save();
    },

    applyHeading: function (tag) {
        if (!document.getElementById('heading-box').classList.contains('active')) return;
        this.restoreSelection();

        const sel = window.getSelection();
        if (sel.rangeCount > 0) {
            document.execCommand('formatBlock', false, tag);
        }

        UI.closeAllMenus();
        Store.save();
    },

    changeFontSize: function (delta) {
        this.restoreSelection();
        const sel = window.getSelection();
        if (!sel.rangeCount) return;

        const clamp = (val) => Math.max(12, Math.min(48, val));

        const getComputedSize = (node) => {
            const el = node.nodeType === 1 ? node : node.parentElement;
            if (!el) return 18;
            return parseFloat(window.getComputedStyle(el).fontSize) || 18;
        };

        const applySize = (node, size) => {
            if (node.nodeType === 1) {
                node.style.fontSize = size + 'px';
                node.style.lineHeight = '1.7';
                node.style.margin = '0';
                node.style.padding = '0';
                node.style.display = 'inline';
            }
        };

        if (sel.isCollapsed) {
            // Cursor Logic
            let node = sel.anchorNode;
            if (node.nodeType === 3) node = node.parentNode;

            let curr = node;
            while (curr && curr.id !== 'editor' && (!curr.style || !curr.style.fontSize)) {
                curr = curr.parentNode;
            }

            const currentSize = getComputedSize(curr && curr.id !== 'editor' ? curr : node);
            const newSize = clamp(currentSize + delta);

            if (curr && curr.tagName === 'SPAN' && curr.style.fontSize && curr.id !== 'editor') {
                curr.style.fontSize = newSize + 'px';
            } else {
                const span = document.createElement('span');
                applySize(span, newSize);
                span.innerHTML = '&#8203;';
                const range = sel.getRangeAt(0);
                range.insertNode(span);
                range.setStart(span, 1);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        } else {
            // Range Logic
            let range = sel.getRangeAt(0);

            // Clean boundaries
            let start = range.startContainer;
            let end = range.endContainer;

            if (start.nodeType === 3 && range.startOffset > 0 && range.startOffset < start.length) {
                const split = start.splitText(range.startOffset);
                range.setStart(split, 0);
            }
            if (end.nodeType === 3 && range.endOffset < end.length && range.endOffset > 0) {
                end.splitText(range.endOffset);
            }

            const getTextNodes = (r) => {
                const nodes = [];
                const iterator = document.createNodeIterator(
                    r.commonAncestorContainer,
                    NodeFilter.SHOW_TEXT,
                    {
                        acceptNode: (node) => {
                            return r.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                        }
                    }
                );
                let currentNode;
                while (currentNode = iterator.nextNode()) {
                    if (currentNode.length > 0) nodes.push(currentNode);
                }
                return nodes;
            };

            const nodes = getTextNodes(range);
            let firstNode = null;
            let lastNode = null;

            nodes.forEach((node, index) => {
                const size = getComputedSize(node);
                const newSize = clamp(size + delta);
                const p = node.parentElement;

                let targetNode = node;

                if (p.tagName === 'SPAN' && p.style.fontSize && p.childNodes.length === 1 && p.id !== 'editor') {
                    applySize(p, newSize);
                    targetNode = p;
                } else {
                    const span = document.createElement('span');
                    applySize(span, newSize);
                    node.replaceWith(span);
                    span.appendChild(node);
                    targetNode = span;
                }

                if (index === 0) firstNode = targetNode;
                lastNode = targetNode;
            });

            if (firstNode && lastNode) {
                sel.removeAllRanges();
                const newRange = document.createRange();
                newRange.setStartBefore(firstNode);
                newRange.setEndAfter(lastNode);
                sel.addRange(newRange);
                this.saveSelection();
            }
        }
        Store.save();
    },

    // Clean pasted content to remove unwanted formatting
    cleanPastedContent: function () {
        const sel = window.getSelection();
        if (!sel.rangeCount) return;

        const range = sel.getRangeAt(0);
        const fragment = range.extractContents();
        const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_ELEMENT, null, false);

        let node;
        const elementsToRemove = [];

        while (node = walker.nextNode()) {
            // Remove style attributes from most elements
            if (node.style) {
                node.removeAttribute('style');
            }

            // Remove specific unwanted tags
            if (node.tagName === 'DIV' && node.parentNode === fragment) {
                // Convert div to p for better structure
                const p = document.createElement('p');
                while (node.firstChild) {
                    p.appendChild(node.firstChild);
                }
                node.parentNode.replaceChild(p, node);
            }

            // Clean up font tags
            if (node.tagName === 'FONT') {
                const span = document.createElement('span');
                if (node.color) span.style.color = node.color;
                if (node.face) span.style.fontFamily = node.face;
                if (node.size) {
                    const sizeMap = { 1: '10px', 2: '13px', 3: '16px', 4: '18px', 5: '24px', 6: '32px', 7: '48px' };
                    span.style.fontSize = sizeMap[node.size] || '16px';
                }
                while (node.firstChild) {
                    span.appendChild(node.firstChild);
                }
                node.parentNode.replaceChild(span, node);
            }
        }

        // Insert cleaned content
        range.insertNode(fragment);

        // Normalize the content
        range.commonAncestorContainer.normalize();

        Store.save();
    },

    // --- REFACTORED: Code Block with Syntax Highlighting ---
    formatCodeBlock: function () {
        this.restoreSelection();

        const selection = window.getSelection();
        let text = selection.toString();

        if (!text) text = "Type your code here...";

        // 1. Escape HTML Entities (Crucial first step)
        text = text.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // 2. Syntax Highlighting (Regex Replacement)
        // A. Strings (Double and Single Quotes)
        text = text.replace(/(['"`])(?:(?!\1)[^\\]|\\.)*\1/g, '<span class="code-string">$&</span>');

        // B. Comments (Double Slash)
        text = text.replace(/(\/\/[^\n]*)/g, '<span class="code-comment">$1</span>');

        // C. Keywords (Boundaries \b)
        const keywords = 'const|let|var|function|return|if|else|for|while|class|import|from|async|await|try|catch|new|this|typeof';
        const kwRegex = new RegExp(`\\b(${keywords})\\b`, 'g');

        text = text.replace(kwRegex, (match) => {
            return `<span class="code-keyword">${match}</span>`;
        });

        // D. Numbers
        text = text.replace(/\b(\d+)\b/g, '<span class="code-number">$1</span>');

        const html = `<pre class="code-block"><code>${text}</code></pre><p><br></p>`;

        document.execCommand('insertHTML', false, html);
        Store.save();
    },

    insertDivider: function (type) {
        this.restoreSelection();
        const hr = `<hr class="custom-divider divider-${type}" contenteditable="false">`;
        document.execCommand('insertHTML', false, hr + '<p><br></p>');
        Store.save();
    },

    handleListInput: function (e) {
        if (e.shiftKey || (e.key !== 'Enter' && e.key !== 'Backspace')) return;
        const sel = window.getSelection();
        if (!sel.rangeCount) return;
        let node = sel.anchorNode;
        if (node.nodeType === 3) node = node.parentNode;
        const li = node.closest('li');
        if (!li) return;
        const cleanText = li.innerText.replace(/\u200B/g, '').trim();
        const hasContent = cleanText.length > 0 || !!li.querySelector('img') || !!li.querySelector('svg');
        if (!hasContent) {
            e.preventDefault();
            document.execCommand('outdent', false, null);
        }
    },

    handleMarkdownTriggers: function (e) {
        // === LISTS: Trigger on SPACE ===
        if (e.key === ' ') {
            const sel = window.getSelection();
            if (!sel.rangeCount) return;
            const range = sel.getRangeAt(0);
            let node = range.startContainer;

            if (node.nodeType === 3) {
                const text = node.textContent;

                // Unordered list: "-"
                if (text.endsWith('-') && text.trim() === '-') {
                    e.preventDefault();
                    document.execCommand('delete', false);
                    document.execCommand('insertUnorderedList', false);
                    return;
                }
                // Ordered list: "1."
                if (text.endsWith('1.') && text.trim() === '1.') {
                    e.preventDefault();
                    document.execCommand('delete', false);
                    document.execCommand('delete', false);
                    document.execCommand('insertOrderedList', false);
                    return;
                }
            }
        }
    },

    // Helper: Convert current block to heading and create new paragraph
    convertToHeading: function (node, tag, content) {
        // Create new heading element
        const newHeader = document.createElement(tag);

        // Parse content for color shortcuts
        const { cleanText, color } = this.parseColorShortcut(content);

        if (color) {
            newHeader.innerHTML = `<span class="text-${color}">${cleanText || ''}</span>`;
        } else {
            newHeader.textContent = cleanText || '';
        }

        // Replace current node with heading
        if (node.parentNode) {
            node.parentNode.replaceChild(newHeader, node);
        }

        // Create new empty paragraph below for typing (default styles)
        const newP = document.createElement('p');
        newP.innerHTML = '<br>';
        newHeader.after(newP);

        // Move cursor to the new paragraph
        const range = document.createRange();
        const sel = window.getSelection();
        range.setStart(newP, 0);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);

        Store.save();
    },

    // Helper: Extract color shortcut from text
    parseColorShortcut: function (text) {
        const colorMap = {
            'red': 'red', 'blue': 'blue', 'green': 'green',
            'orange': 'orange', 'purple': 'purple',
            'neutral': 'neutral', 'black': 'neutral', 'white': 'neutral'
        };

        const match = text.match(/@([a-zA-Z]+)/);
        if (match) {
            const colorName = match[1].toLowerCase();
            if (colorMap[colorName]) {
                return {
                    cleanText: text.replace(/@[a-zA-Z]+\s*/g, '').trim(),
                    color: colorMap[colorName]
                };
            }
        }
        return { cleanText: text, color: null };
    },

    // New: Dynamic Colored Heading Execution
    executeColoredHeading: function (keyword, colorName) {
        // 1. Determine Tag
        const tag = (keyword === 'subHead') ? 'H2' : 'H1';

        // 2. Identify Current Block
        const sel = window.getSelection();
        if (!sel.rangeCount) return;
        let node = sel.anchorNode;
        if (node.nodeType === 3) node = node.parentNode;

        // Find block container
        while (node && node.id !== 'editor' && !['P', 'DIV', 'H1', 'H2', 'H3', 'LI'].includes(node.tagName)) {
            node = node.parentNode;
        }

        if (!node || node.id === 'editor') {
            // Fallback: execCommand if we can't find node (unlikely)
            document.execCommand('formatBlock', false, tag);
            return;
        }

        // 3. Create New Heading
        const newHeader = document.createElement(tag);

        // 4. Content Handling (Wrap in Span for Color Specificity)
        const validThemeColors = ['neutral', 'red', 'orange', 'green', 'blue', 'purple'];
        const isThemeColor = validThemeColors.includes(colorName.toLowerCase());

        const span = document.createElement('span');

        if (isThemeColor) {
            span.className = `text-${colorName.toLowerCase()}`;
        } else {
            span.style.color = colorName;
        }

        // Transfer existing content to the span
        span.innerHTML = node.innerHTML;

        // Add span to header
        newHeader.appendChild(span);
        // Add ZWS for cursor position if empty? No, just keep it.

        // 5. Replace Block
        if (node.parentNode) {
            node.parentNode.replaceChild(newHeader, node);
        }

        // 6. Set Cursor to END of the Span inside Heading
        // This ensures user can keep typing "My Title" if they did the shortcut first
        const range = document.createRange();
        range.selectNodeContents(span);
        range.collapse(false); // End of span
        sel.removeAllRanges();
        sel.addRange(range);

        // IMPORTANT: Reset toolbar state to reflect new block
        this.checkToolbarState();

        Store.save();
    },

    // New: Dynamic Font Execution
    executeDynamicFont: function (fontName) {
        // Map short names to standard fonts
        const fontMap = {
            'Fredoka': 'Fredoka', 'Inter': 'Inter', 'Merriweather': 'Merriweather',
            'Playpen': 'Playpen Sans', 'Kalam': 'Kalam',
            'Pacifico': 'Pacifico', 'Satisfy': 'Satisfy', 'Poppins': 'Poppins',
            'Monospace': 'monospace', 'Serif': 'serif', 'Sans': 'sans-serif'
        };

        // Normalize input (capitalize first letter for lookup, though mapping keys are specific)
        // Better: Case insensitive lookup
        const key = Object.keys(fontMap).find(k => k.toLowerCase() === fontName.toLowerCase());
        const realFont = key ? fontMap[key] : fontName; // Fallback to raw name if not found

        // Apply to current block
        const sel = window.getSelection();
        if (!sel.rangeCount) return;
        let node = sel.anchorNode;
        if (node.nodeType === 3) node = node.parentNode;

        // Find block container
        while (node && node.id !== 'editor' && !['P', 'DIV', 'H1', 'H2', 'H3', 'LI'].includes(node.tagName)) {
            node = node.parentNode;
        }

        if (!node || node.id === 'editor') {
            document.execCommand('fontName', false, realFont);
            return;
        }

        // Apply font style directly to the block
        // If it's a list item, we might want to wrap content, but applying to LI usually works for text inside.
        // However, user said "kisi bhi line ko" (any line).

        // Strategy: Apply style directly to the block element
        node.style.fontFamily = `'${realFont}', sans-serif`;

        // Reset sidebar font selection if needed?
        // Logic.checkToolbarState() should handle it on next click

        Store.save();
    },

    // --- SEARCH ---
    searchResults: [],
    currentSearchIndex: -1,
    isSearching: false,

    performSearch: function (term) {
        this.clearSearch();
        if (!term || term.length < 2) return;
        const editor = UI.els.editor;
        const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null, false);
        const nodes = [];
        let node;
        while (node = walker.nextNode()) nodes.push(node);
        const regex = new RegExp(`(${term})`, 'gi');
        let matchCount = 0;
        nodes.forEach(textNode => {
            if (textNode.nodeValue && textNode.nodeValue.match(regex)) {
                const parent = textNode.parentNode;
                if (parent.tagName === 'MARK') return;
                const frag = document.createDocumentFragment();
                let lastIdx = 0;
                textNode.nodeValue.replace(regex, (match, p1, offset) => {
                    const before = textNode.nodeValue.slice(lastIdx, offset);
                    if (before) frag.appendChild(document.createTextNode(before));
                    const mark = document.createElement('mark');
                    mark.className = 'search-highlight';
                    mark.textContent = match;
                    frag.appendChild(mark);
                    lastIdx = offset + match.length;
                    matchCount++;
                    return match;
                });
                const remaining = textNode.nodeValue.slice(lastIdx);
                if (remaining) frag.appendChild(document.createTextNode(remaining));
                parent.replaceChild(frag, textNode);
            }
        });
        if (matchCount > 0) {
            this.searchResults = document.querySelectorAll('.search-highlight');
            this.currentSearchIndex = -1;
            this.isSearching = true;
            this.findNextMatch();
        }
    },

    findNextMatch: function () {
        if (!this.searchResults.length) return;
        if (this.currentSearchIndex >= 0 && this.searchResults[this.currentSearchIndex]) {
            this.searchResults[this.currentSearchIndex].classList.remove('current');
        }
        this.currentSearchIndex++;
        if (this.currentSearchIndex >= this.searchResults.length) this.currentSearchIndex = 0;
        const el = this.searchResults[this.currentSearchIndex];
        el.classList.add('current');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },

    clearSearch: function () {
        const marks = UI.els.editor.querySelectorAll('mark.search-highlight');
        marks.forEach(mark => {
            const parent = mark.parentNode;
            parent.replaceChild(document.createTextNode(mark.textContent), mark);
            parent.normalize();
        });
        this.searchResults = [];
        this.currentSearchIndex = -1;
        this.isSearching = false;
    },

    handleInput: function (e) {
        // We only care if input just happened (character or space)
        // Check for triggers at cursor position
        const sel = window.getSelection();
        if (!sel.rangeCount) return;

        const range = sel.getRangeAt(0);
        const node = range.startContainer;

        // We only support shortcuts in text nodes
        if (node.nodeType !== 3) return;

        const text = node.textContent;
        // Check triggers

        // 1. DIVIDERS (=== or ---)
        if (text.endsWith('===') || text.endsWith('---')) {
            const trigger = text.slice(-3);
            if (text.trim() === trigger) {
                // Remove trigger
                const newRange = document.createRange();
                newRange.setStart(node, range.startOffset - 3);
                newRange.setEnd(node, range.startOffset);
                sel.removeAllRanges();
                sel.addRange(newRange);
                document.execCommand('delete');

                // Insert Divider
                const type = trigger === '===' ? 'double' : 'dashed';
                this.insertDivider(type);
                return;
            }
        }

        // 2. COLON TRIGGERS (@Keyword: or #Keyword[Color]: or #Keyword.Color:)
        // Look for pattern ending in colon
        const textBeforeCursor = text.slice(0, range.startOffset);

        // Regex breakdown:
        // ([@#])        -> Starts with @ or #
        // ([a-zA-Z0-9]+) -> Main keyword (e.g. head, subHead, red)
        // (?: ... )?    -> Optional complex part
        //   [\[\.]([a-zA-Z0-9]+)[\]]? -> [color] or .color
        // :$            -> Ends with colon

        const match = textBeforeCursor.match(/([@#])([a-zA-Z0-9]+)(?:[\[\.]([a-zA-Z0-9]+)[\]]?)?:$/);

        if (match) {
            const fullTrigger = match[0];
            const prefix = match[1];      // @ or #
            const keyword = match[2];     // head, red, etc.
            const param = match[3];       // color (if present)

            const matchIndex = match.index;

            // Define textBeforeTrigger for scope checks
            const textBeforeTrigger = textBeforeCursor.slice(0, matchIndex);

            // 3. CHECK SCOPE (Block vs Inline)
            const blockShortcuts = ['head', 'subHead', 'code'];
            const isBlockShortcut = blockShortcuts.includes(keyword);

            // Check if we are inside a list item
            let inList = false;
            let p = node.parentNode;
            while (p && p.id !== 'editor') {
                if (p.tagName === 'LI') {
                    inList = true;
                    break;
                }
                p = p.parentNode;
            }

            // Inline shortcuts can be anywhere
            const isAtStart = textBeforeTrigger.trim().length === 0;

            // HANDLE SHORTCUTS
            const execute = () => {
                // DELETE TRIGGER
                const newRange = document.createRange();
                newRange.setStart(node, matchIndex);
                newRange.setEnd(node, range.startOffset);
                sel.removeAllRanges();
                sel.addRange(newRange);
                document.execCommand('delete');

                // EXECUTE
                if (prefix === '#' && param && (keyword === 'head' || keyword === 'subHead')) {
                    // Dynamic Colored Heading
                    this.executeColoredHeading(keyword, param);
                } else if (prefix === '#' && keyword.toLowerCase() === 'setfont' && param) {
                    // Dynamic Font Shortcut (Case-Insensitive for keyword)
                    this.executeDynamicFont(param);
                } else {
                    // Standard Shortcut
                    this.executeShortcut(keyword);
                }
            };

            // RULE: Block shortcuts allowed ONLY if at start AND NOT in a list
            if (isBlockShortcut) {
                if (isAtStart && !inList) {
                    execute();
                }
            } else {
                // Inline shortcuts and restore allowed anywhere
                // But for color shortcuts, we just execute.
                execute();
            }
        }
    },

    // Helper: Restore line to plain text
    restoreLineFormatting: function () {
        this.restoreSelection();
        const sel = window.getSelection();
        if (!sel.rangeCount) return;

        let node = sel.anchorNode;
        // Find the block container (P, H1, etc.)
        while (node && node.id !== 'editor' && !['P', 'H1', 'H2', 'H3', 'DIV', 'LI'].includes(node.tagName)) {
            node = node.parentNode;
        }

        if (node && node.id !== 'editor') {
            // Get text content
            const text = node.innerText || node.textContent;

            // Create new plain paragraph
            const newP = document.createElement('p');
            newP.textContent = text; // Plain text only

            // Replace
            node.parentNode.replaceChild(newP, node);

            // Restore cursor to end (simplest for now, or match offset if possible)
            // Matching offset is hard because structure changed. End is safe for "restore".
            const range = document.createRange();
            range.selectNodeContents(newP);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);

            // Reset toolbar state
            this.checkToolbarState();
        }
    },

    executeShortcut: function (keyword) {
        switch (keyword) {
            case 'restore':
                this.restoreLineFormatting();
                break;
            case 'head':
                this.formatHeading('H1');
                break;
            case 'subHead':
                this.formatHeading('H2');
                break;
            case 'bold':
                this.formatText('bold');
                break;
            case 'italic':
                this.formatText('italic');
                break;
            case 'underline':
                this.formatText('underline');
                break;
            case 'addTab':
                document.execCommand('indent');
                break;
            case 'code':
                this.formatCodeBlock();
                break;
            default:
                // Universal Color Support
                // Any unknown keyword is attempted as a color
                // Font shortcuts handled separately if they start with setFont
                if (keyword.startsWith('setFont')) {
                    const fontName = keyword.replace('setFont', '');
                    const fontMap = {
                        'Fredoka': 'Fredoka', 'Inter': 'Inter', 'Merriweather': 'Merriweather',
                        'PlaypenSans': 'Playpen Sans', 'Kalam': 'Kalam',
                        'Pacifico': 'Pacifico', 'Satisfy': 'Satisfy', 'Poppins': 'Poppins'
                    };
                    const realFont = fontMap[fontName];
                    if (realFont) {
                        this.setFont(realFont);
                    }
                } else {
                    // Try as color
                    this.setTextColor(keyword.toLowerCase());
                }
                break;
        }
    },

    handleEnterShortcuts: function (e) {
        // On pressing ENTER:
        // - Colors and formatting should reset for the new line
        // - Browser usually carries over style.

        // Let the default Enter happen (Logic event listener usually allows default unless prevented)
        // Wait, main.js calls handleEnterShortcuts.
        // If we want to reset formatting on the NEW line, we should allow the Enter to happen, then strip format?

        // Actually, main.js lines 2154 just calls this. If it returns true/false or e.defaultPrevented?
        // We can use setTimeout to act AFTER the enter.

        setTimeout(() => {
            // Check if we have active formatting
            if (document.queryCommandState('bold') || document.queryCommandState('italic') || document.queryCommandState('underline')) {
                document.execCommand('removeFormat');
            }

            // Reset class-based colors
            // Since we use classes now, 'removeFormat' might not catch them.
            // We strip our specific color classes from the current block/span
            const sel = window.getSelection();
            if (sel.rangeCount) {
                let node = sel.anchorNode;
                if (node.nodeType === 3) node = node.parentNode;

                // If we are in an empty new line inside a colored span, unwrap or remove class
                const validClasses = ['text-neutral', 'text-red', 'text-orange', 'text-green', 'text-blue', 'text-purple'];

                // Check if current node has one of these classes
                if (node.tagName === 'SPAN' && validClasses.some(c => node.classList.contains(c))) {
                    // Remove the color class
                    validClasses.forEach(c => node.classList.remove(c));
                }

                // Also check ancestors (sometimes browser nests)
                let parent = node.parentNode;
                while (parent && parent.id !== 'editor') {
                    if (parent.tagName === 'SPAN' && validClasses.some(c => parent.classList.contains(c))) {
                        // If parent is colored, we need to break out. 
                        // Simplest way for a new line is to insert a clean span or text node?
                        // Or just use removeFormat default behavior which often breaks styles?
                        // Let's just try to be simple: the above check for immediate parent is mostly enough for 'Enter'.
                    }
                    parent = parent.parentNode;
                }
            }
        }, 10);
    },

    installPWA: async function () {
        if (!this.deferredPrompt) return;
        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            this.deferredPrompt = null;
            document.getElementById('btn-install').style.display = 'none';
        }
    }
};

/* ================================
   SOURCE: js/main.js (partial - only initApp function)
   PURPOSE: App initialization and event listeners setup
   NOTE: This runs after all objects are defined
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
    // Context menu clicks (already handled in chip-context-menu section)

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

// Expose Globals for Inline Handlers
window.UI = UI;
window.Logic = Logic;
window.SettingsUI = SettingsUI;

// Initialize Settings on Load
document.addEventListener('DOMContentLoaded', () => {
    SettingsUI.init();
});