/* ================================
   SETTINGS & THEME SYSTEM
   PURPOSE: Theme management, settings UI, and preferences persistence
   ================================ */

const Settings = {
    // Default settings
    defaults: {
        theme: 'dark',
        editorFont: 'Playpen Sans',
        editorFontSize: '18',
        autoSave: true
    },

    // Current settings
    current: {},

    // Initialize settings
    init: function() {
        this.loadSettings();
        this.applySettings();
        this.bindEvents();
    },

    // Load settings from localStorage
    loadSettings: function() {
        const saved = localStorage.getItem('focuspad_settings');
        if (saved) {
            try {
                this.current = JSON.parse(saved);
            } catch (e) {
                this.current = { ...this.defaults };
            }
        } else {
            this.current = { ...this.defaults };
        }
    },

    // Save settings to localStorage
    saveSettings: function() {
        localStorage.setItem('focuspad_settings', JSON.stringify(this.current));
    },

    // Apply all settings to the UI
    applySettings: function() {
        // Apply theme
        this.setTheme(this.current.theme || this.defaults.theme);
        
        // Apply editor font
        if (this.current.editorFont) {
            this.setEditorFont(this.current.editorFont);
            const fontSelect = document.getElementById('editor-font-select');
            if (fontSelect) fontSelect.value = this.current.editorFont;
        }
        
        // Apply font size
        if (this.current.editorFontSize) {
            this.setEditorFontSize(this.current.editorFontSize);
            const sizeSelect = document.getElementById('font-size-select');
            if (sizeSelect) sizeSelect.value = this.current.editorFontSize;
        }
        
        // Apply auto-save
        const autoSaveToggle = document.getElementById('auto-save-toggle');
        if (autoSaveToggle) {
            autoSaveToggle.checked = this.current.autoSave !== false;
        }
    },

    // Set theme and update UI
    setTheme: function(theme) {
        this.current.theme = theme;
        document.body.setAttribute('data-theme', theme);
        
        // Update theme toggle buttons
        document.querySelectorAll('.theme-option').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.theme === theme) {
                btn.classList.add('active');
            }
        });
        
        this.saveSettings();
        this.updateThemeDependentElements();
    },

    // Set editor font
    setEditorFont: function(font) {
        this.current.editorFont = font;
        document.documentElement.style.setProperty('--editor-font', font);
        
        const editor = document.getElementById('editor');
        if (editor) {
            editor.style.fontFamily = `${font}, cursive`;
        }
        
        this.saveSettings();
    },

    // Set editor font size
    setEditorFontSize: function(size) {
        this.current.editorFontSize = size;
        document.documentElement.style.setProperty('--editor-font-size', size + 'px');
        
        const editor = document.getElementById('editor');
        if (editor) {
            editor.style.fontSize = size + 'px';
        }
        
        this.saveSettings();
    },

    // Update elements that depend on theme
    updateThemeDependentElements: function() {
        // Update color swatches border for light theme
        const colorSwatches = document.querySelectorAll('.color-swatch');
        colorSwatches.forEach(swatch => {
            if (this.current.theme === 'light') {
                swatch.style.borderColor = '#ccc';
            } else {
                swatch.style.borderColor = '#333';
            }
        });
    },

    // Bind event listeners
    bindEvents: function() {
        // Theme toggle buttons
        document.querySelectorAll('.theme-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const theme = e.currentTarget.dataset.theme;
                this.setTheme(theme);
            });
        });
        
        // Editor font select
        const fontSelect = document.getElementById('editor-font-select');
        if (fontSelect) {
            fontSelect.addEventListener('change', (e) => {
                this.setEditorFont(e.target.value);
            });
        }
        
        // Font size select
        const sizeSelect = document.getElementById('font-size-select');
        if (sizeSelect) {
            sizeSelect.addEventListener('change', (e) => {
                this.setEditorFontSize(e.target.value);
            });
        }
        
        // Auto-save toggle
        const autoSaveToggle = document.getElementById('auto-save-toggle');
        if (autoSaveToggle) {
            autoSaveToggle.addEventListener('change', (e) => {
                this.current.autoSave = e.target.checked;
                this.saveSettings();
            });
        }
    },

    // Export settings for other modules
    getSettings: function() {
        return { ...this.current };
    },

    // Reset to defaults
    resetToDefaults: function() {
        this.current = { ...this.defaults };
        this.applySettings();
        this.saveSettings();
    }
};

// Initialize settings when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Settings.init();
});

// Add settings-related functions to UI object
if (typeof UI !== 'undefined') {
    // Extend UI with settings modal functions
    UI.openSettingsModal = function() {
        const overlay = document.getElementById('settings-modal-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
            setTimeout(() => overlay.style.opacity = '1', 10);
        }
    };

    UI.closeSettingsModal = function() {
        const overlay = document.getElementById('settings-modal-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.style.display = 'none', 300);
        }
    };

    // Extend modal handling to include settings
    const originalOpenModal = UI.openModal;
    UI.openModal = function(mode, titleOrId, msgOrLabel = null, callback = null) {
        if (mode === 'settings') {
            UI.openSettingsModal();
        } else {
            originalOpenModal.call(this, mode, titleOrId, msgOrLabel, callback);
        }
    };
}

// Add folder system functionality
const Folders = {
    folders: [],
    currentFolder: 'all',

    init: function() {
        this.loadFolders();
        this.renderFolders();
    },

    loadFolders: function() {
        const saved = localStorage.getItem('focuspad_folders');
        if (saved) {
            try {
                this.folders = JSON.parse(saved);
            } catch (e) {
                this.folders = [
                    { id: 'all', name: 'All Notes', icon: 'ph-note' },
                    { id: 'pinned', name: 'Pinned', icon: 'ph-push-pin' },
                    { id: 'work', name: 'Work', icon: 'ph-briefcase' },
                    { id: 'personal', name: 'Personal', icon: 'ph-user' }
                ];
            }
        } else {
            this.folders = [
                { id: 'all', name: 'All Notes', icon: 'ph-note' },
                { id: 'pinned', name: 'Pinned', icon: 'ph-push-pin' },
                { id: 'work', name: 'Work', icon: 'ph-briefcase' },
                { id: 'personal', name: 'Personal', icon: 'ph-user' }
            ];
        }
    },

    saveFolders: function() {
        localStorage.setItem('focuspad_folders', JSON.stringify(this.folders));
    },

    renderFolders: function() {
        const foldersList = document.getElementById('folders-list');
        if (!foldersList) return;

        foldersList.innerHTML = '';
        
        this.folders.forEach(folder => {
            const folderItem = document.createElement('div');
            folderItem.className = 'folder-item';
            if (folder.id === this.currentFolder) {
                folderItem.classList.add('active');
            }
            
            folderItem.innerHTML = `
                <i class="ph ${folder.icon}"></i>
                <span class="folder-name">${folder.name}</span>
            `;
            
            folderItem.onclick = () => {
                this.setCurrentFolder(folder.id);
                if (typeof UI !== 'undefined' && UI.renderNotesList) {
                    UI.renderNotesList();
                }
            };
            
            foldersList.appendChild(folderItem);
        });
    },

    setCurrentFolder: function(folderId) {
        this.currentFolder = folderId;
        this.renderFolders();
    },

    getCurrentFolder: function() {
        return this.currentFolder;
    },

    getNotesByFolder: function(notes) {
        if (this.currentFolder === 'all') {
            return notes;
        } else if (this.currentFolder === 'pinned') {
            return notes.filter(note => note.is_pinned);
        } else {
            // For custom folders, we would filter by folder ID
            // This requires adding folder_id to notes
            return notes; // Placeholder
        }
    },

    addFolder: function(name, icon = 'ph-folder') {
        const newFolder = {
            id: 'folder_' + Date.now(),
            name: name,
            icon: icon
        };
        
        this.folders.push(newFolder);
        this.saveFolders();
        this.renderFolders();
    },

    removeFolder: function(folderId) {
        this.folders = this.folders.filter(f => f.id !== folderId);
        this.saveFolders();
        this.renderFolders();
    }
};

// Initialize folders when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Folders.init();
});

// Update Store.getFilteredNotes to consider folders
const originalGetFilteredNotes = Store.getFilteredNotes;
Store.getFilteredNotes = function() {
    const notes = originalGetFilteredNotes.call(this);
    return Folders.getNotesByFolder(notes);
};

// Update UI.renderChips to work with folders
const originalRenderChips = UI.renderChips;
UI.renderChips = function() {
    // Save current active ID before filtering
    const activeId = Store.activeId;
    
    // Get filtered notes
    const notes = Store.getFilteredNotes();
    
    // If active note is not in filtered list, select first note
    if (activeId && !notes.find(n => n.id === activeId)) {
        if (notes.length > 0) {
            Store.activeId = notes[0].id;
            this.loadNoteContent();
        } else {
            Store.activeId = null;
        }
    }
    
    // Call original renderChips
    originalRenderChips.call(this);
};

// Update UI.renderNotesList to work with folders
const originalRenderNotesList = UI.renderNotesList;
UI.renderNotesList = function() {
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
            if (window.innerWidth < 769) {
                UI.toggleSidebar();
            }
        };

        notesList.appendChild(item);
    });
};