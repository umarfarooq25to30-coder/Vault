// Full-screen notes page with elegant card dashboard layout, categorized classification rail, double-click inline renames, right-click context menus, and a rich fullscreen editor popup modal.

import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  FileText,
  Plus,
  Search,
  FolderPlus,
  Trash2,
  Folder,
  Star,
  Calendar,
  Tag,
  Loader2,
  CheckCircle2,
  X,
  MoreHorizontal,
  ChevronRight,
  Clock,
  Lock,
  Unlock,
  Copy,
  Download,
  Edit,
  Sparkles,
  CheckSquare,
  GripVertical,
  FolderOpen,
  Pencil,
  Palette,
  LayoutGrid,
  List
} from "lucide-react";
import { useNotes } from "../hooks/useNotes";
import { useUiStore } from "../store/uiStore";
import { useVaultStore } from "../store/vaultStore";
import { NoteEditor } from "../components/editor/NoteEditor";
import {
  deleteItem,
  deleteFolder,
  updateFolder,
  getFolders,
} from "../db/vaultOperations";
import { useToastStore } from "../store/toastStore";
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

const getFolderColor = (color) => {
  if (!color || color === "#1A1A1A" || color === "#000000") {
    return "#888888";
  }
  return color;
};

export function Notes() {
  const {
    notes,
    folders: initialFolders,
    loading,
    activeNote,
    setActiveNote,
    loadNotesData,
    getDecryptedNote,
    addSecureNote,
    updateSecureNote,
    deleteSecureNote,
    toggleSecureFavorite,
    addFolder,
    updateSecureFolder,
    deleteSecureFolder,
  } = useNotes();

  const loadNotes = loadNotesData;
  const addToast = useToastStore((state) => state.addToast);

  const { theme } = useUiStore();
  const isDark = theme === "dark";
  const derivedKey = useVaultStore((state) => state.derivedKey);

  // Layout and filter states
  const [selectedFolderId, setSelectedFolderId] = useState("all"); // 'all', 'favorites', or folder ID string
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef(null);

  useKeyboardShortcuts({
    onSearch: () => {
      searchInputRef.current?.focus();
    },
    onNew: () => {
      handleAddNewNote();
    },
    onEscape: () => {
      if (activeNote) {
        setActiveNote(null);
      }
    }
  });

  const [sortBy, setSortBy] = useState("updatedAt"); // 'updatedAt', 'title'
  const [activeNoteMode, setActiveNoteMode] = useState("view"); // 'view' | 'edit'
  const previewRef = useRef(null);

  // Note inline actions
  const [renamingNoteId, setRenamingNoteId] = useState(null);
  const [renamingTitle, setRenamingTitle] = useState("");

  // Modals and popup states
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("#888888");

  const [noteToDelete, setNoteToDelete] = useState(null);
  const [contextMenu, setContextMenu] = useState(null); // { x, y, noteId, noteTitle }
  const [moreDropdownId, setMoreDropdownId] = useState(null); // id of active note for dropdown in popup modal
  const [moreDropdownPos, setMoreDropdownPos] = useState({ top: 0, right: 0 });

  // Decryption / Passphrase Locks States
  const [lockNoteToUnlock, setLockNoteToUnlock] = useState(null);
  const [lockPassphraseInput, setLockPassphraseInput] = useState("");
  const [lockError, setLockError] = useState("");
  const [unlockTargetMode, setUnlockTargetMode] = useState("view");

  const [lockNoteToSecure, setLockNoteToSecure] = useState(null);
  const [newLockPassphrase, setNewLockPassphrase] = useState("");
  const [newLockPassphraseConfirm, setNewLockPassphraseConfirm] = useState("");
  const [newLockHint, setNewLockHint] = useState("");
  const [newLockError, setNewLockError] = useState("");

  const [lockNoteToUnlockForRemoval, setLockNoteToUnlockForRemoval] =
    useState(null);
  const [removeLockPassphraseInput, setRemoveLockPassphraseInput] =
    useState("");
  const [removeLockError, setRemoveLockError] = useState("");

  const sha256 = async (message) => {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const handleUnlockSubmit = async () => {
    if (!lockPassphraseInput) {
      setLockError("Please enter the passphrase.");
      return;
    }
    try {
      const hash = await sha256(lockPassphraseInput);
      if (hash === lockNoteToUnlock.lockHash) {
        const fullNote = await getDecryptedNote(lockNoteToUnlock.id);
        if (fullNote) {
          if (unlockTargetMode === "duplicate") {
            await addSecureNote(
              `${fullNote.title} (Copy)`,
              fullNote.data,
              fullNote.folderId,
              fullNote.tags,
            );
          } else {
            setActiveNote(fullNote);
            setActiveNoteMode(unlockTargetMode || "view");
          }
          setLockNoteToUnlock(null);
        }
      } else {
        setLockError("Incorrect passphrase. Access denied.");
      }
    } catch (err) {
      console.error(err);
      setLockError("Failed to verify passphrase hash.");
    }
  };

  const handleRemoveLockSubmit = async () => {
    if (!removeLockPassphraseInput) {
      setRemoveLockError("Please enter the passphrase.");
      return;
    }
    try {
      const hash = await sha256(removeLockPassphraseInput);
      if (hash === lockNoteToUnlockForRemoval.lockHash) {
        await updateSecureNote(lockNoteToUnlockForRemoval.id, {
          isLocked: false,
          lockHash: null,
          lockHint: null,
        });
        setLockNoteToUnlockForRemoval(null);
        addToast({
          variant: "success",
          title: "Lock Removed",
          description: `"${lockNoteToUnlockForRemoval.title || "Note"}" lock has been decrypted and removed.`,
        });
      } else {
        setRemoveLockError("Incorrect passphrase. Access denied.");
      }
    } catch (err) {
      console.error(err);
      setRemoveLockError("Failed to verify passphrase hash.");
    }
  };

  // Selection states & handlers for bulk delete (BUG 6)
  const [selectedNoteIds, setSelectedNoteIds] = useState(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const isSelectMode = selectedNoteIds.size > 0;

  const handleSelectNoteId = (id) => {
    setSelectedNoteIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const toggleSelectNote = (id) => {
    setSelectedNoteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedNoteIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedNoteIds.size === 0) return;

    // Prevent double-click
    if (isBulkDeleting) return;
    setIsBulkDeleting(true);

    try {
      const ids = Array.from(selectedNoteIds);

      // Delete each note one by one from IndexedDB
      for (const id of ids) {
        await deleteItem(id);
      }

      // If active note was deleted, clear it
      if (activeNote && selectedNoteIds.has(activeNote.id)) {
        setActiveNote(null);
      }

      // Clear selection state
      setSelectedNoteIds(new Set());

      // Reload notes from DB to reflect changes
      await loadNotes();

      // Show success toast
      addToast({
        variant: "success",
        title: `${ids.length} note${ids.length > 1 ? "s" : ""} deleted`,
        description: "Selected notes have been permanently removed.",
        duration: 3000,
      });
    } catch (err) {
      addToast({
        variant: "danger",
        title: "Delete failed",
        description: err.message || "Could not delete selected notes.",
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Close context menu when user clicks outside (BUG 2)
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
    };
    if (contextMenu) {
      document.addEventListener("click", handleClickOutside);
      document.addEventListener("contextmenu", handleClickOutside);
    }
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("contextmenu", handleClickOutside);
    };
  }, [contextMenu]);

  // Folder state
  const [folders, setFolders] = useState([]);
  const [activeFolder, setActiveFolder] = useState(null);
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [colorPickerFolder, setColorPickerFolder] = useState(null);

  // Drag state
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  // Context menu state
  const [folderMenu, setFolderMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    folder: null,
  });

  // Folder multi-select and order management states
  const [isManageFolders, setIsManageFolders] = useState(false);
  const [selectedFolderIds, setSelectedFolderIds] = useState(new Set());

  // Sync database state and Custom Ordering on mount/update
  useEffect(() => {
    if (initialFolders && initialFolders.length > 0) {
      const raw = [...initialFolders];
      const saved = localStorage.getItem("vault_folder_order");
      if (saved) {
        try {
          const order = JSON.parse(saved);
          raw.sort((a, b) => (order[a.id] ?? 999) - (order[b.id] ?? 999));
        } catch {}
      }
      setFolders(raw);
    } else {
      setFolders(initialFolders || []);
    }
  }, [initialFolders]);

  const loadFolders = async () => {
    const raw = await getFolders();
    const saved = localStorage.getItem("vault_folder_order");
    if (saved) {
      try {
        const order = JSON.parse(saved);
        raw.sort((a, b) => (order[a.id] ?? 999) - (order[b.id] ?? 999));
      } catch {}
    }
    setFolders(raw);
  };

  const handleDragStart = (e, folder) => {
    setDraggedId(folder.id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(folder.id));
  };

  const handleDragOver = (e, folder) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (folder.id !== draggedId) {
      setDragOverId(folder.id);
    }
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverId(null);
    }
  };

  const handleDrop = (e, targetFolder) => {
    e.preventDefault();

    if (!draggedId || draggedId === targetFolder.id) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    setFolders((prev) => {
      const list = [...prev];
      const fromIdx = list.findIndex((f) => f.id === draggedId);
      const toIdx = list.findIndex((f) => f.id === targetFolder.id);
      if (fromIdx === -1 || toIdx === -1) return prev;

      const [moved] = list.splice(fromIdx, 1);
      list.splice(toIdx, 0, moved);

      // Persist order — localStorage only, no DB call
      const order = {};
      list.forEach((f, i) => {
        order[f.id] = i;
      });
      localStorage.setItem("vault_folder_order", JSON.stringify(order));

      return list;
    });

    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const openFolderMenu = (e, folder, action = null) => {
    e.preventDefault();
    e.stopPropagation();

    if (action === "rename") {
      setEditingFolderId(folder.id);
      return;
    }

    const MENU_H = 160;
    const MENU_W = 180;
    const PAD = 8;

    let x = e.clientX;
    let y = e.clientY;

    if (y + MENU_H > window.innerHeight - PAD) {
      y = y - MENU_H;
    }
    if (x + MENU_W > window.innerWidth - PAD) {
      x = x - MENU_W;
    }

    y = Math.max(PAD, y);
    x = Math.max(PAD, x);

    setFolderMenu({ visible: true, x, y, folder });
  };

  const closeFolderMenu = () => {
    setFolderMenu({
      visible: false,
      x: 0,
      y: 0,
      folder: null,
    });
  };

  const handleToggleSelectFolder = (folderId, e) => {
    e.stopPropagation();
    setSelectedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleToggleSelectAllFolders = () => {
    if (selectedFolderIds.size === folders.length) {
      setSelectedFolderIds(new Set());
    } else {
      setSelectedFolderIds(new Set(folders.map((f) => f.id)));
    }
  };

  const handleRenameFolder = async (id, newName) => {
    const trimmed = newName?.trim();
    setEditingFolderId(null);
    if (!trimmed || trimmed.length === 0) return;
    const current = folders.find((f) => f.id === id);
    if (current?.name === trimmed) return;

    try {
      setFolders((prev) =>
        prev.map((f) => (f.id === id ? { ...f, name: trimmed } : f)),
      );
      await updateFolder(id, { name: trimmed });
      await loadNotesData();
    } catch (err) {
      await loadFolders();
      addToast({
        variant: "danger",
        title: "Rename failed",
        description: err.message,
      });
    }
  };

  const handleChangeColor = async (folderId, color) => {
    try {
      setFolders((prev) =>
        prev.map((f) => (f.id === folderId ? { ...f, color } : f)),
      );
      await updateFolder(folderId, { color });
      await loadNotesData();
    } catch {
      await loadFolders();
    } finally {
      setColorPickerFolder(null);
    }
  };

  const handleDeleteFolder = async (folderId) => {
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return;

    if (folder.isDefault) {
      addToast({
        variant: "warning",
        title: "Cannot delete",
        description: `"${folder.name}" is a default folder and cannot be deleted.`,
        duration: 3000,
      });
      return;
    }

    try {
      await deleteFolder(folderId);

      if (
        activeFolder === folderId ||
        selectedFolderId === folderId.toString()
      ) {
        setActiveFolder(null);
        setSelectedFolderId("all");
      }

      setFolders((prev) => prev.filter((f) => f.id !== folderId));

      const saved = localStorage.getItem("vault_folder_order");
      if (saved) {
        try {
          const order = JSON.parse(saved);
          delete order[folderId];
          localStorage.setItem("vault_folder_order", JSON.stringify(order));
        } catch {}
      }

      await loadNotesData();

      addToast({
        variant: "success",
        title: "Folder deleted",
        description: `"${folder.name}" deleted. Notes moved to All Notes.`,
        duration: 3000,
      });
    } catch (err) {
      if (err.message === "DEFAULT_FOLDER_PROTECTED") {
        addToast({
          variant: "warning",
          title: "Cannot delete",
          description: "Default folders cannot be deleted.",
        });
      } else {
        addToast({
          variant: "danger",
          title: "Delete failed",
          description: err.message,
        });
        await loadFolders();
      }
    }
  };

  const handleBulkDeleteFolders = async () => {
    if (selectedFolderIds.size === 0) return;
    if (
      window.confirm(
        `Are you sure you want to delete ${selectedFolderIds.size} selected folder(s)? All notes inside them will safely be moved to "No Classification".`,
      )
    ) {
      try {
        for (const folderId of selectedFolderIds) {
          await handleDeleteFolder(folderId);
        }
        setSelectedFolderIds(new Set());
        setIsManageFolders(false);
        setSelectedFolderId("all");
      } catch (err) {
        console.error("Failed to delete folders in bulk:", err);
      }
    }
  };

  // Local editor save state
  const [saveStatus, setSaveStatus] = useState("idle"); // 'idle' | 'saving' | 'saved' | 'error'

  const [localTitle, setLocalTitle] = useState("");
  const lastActiveNoteIdRef = useRef(null);

  // Sync state when active note changes and commit old note's title if changed
  useEffect(() => {
    if (activeNote) {
      if (lastActiveNoteIdRef.current !== activeNote.id) {
        // If a different note was previously active, save its title if it was modified
        if (lastActiveNoteIdRef.current) {
          const oldNoteId = lastActiveNoteIdRef.current;
          const oldNote = (notes || []).find((n) => n.id === oldNoteId);
          if (oldNote && oldNote.title !== localTitle) {
            updateSecureNote(oldNoteId, {
              title: localTitle || "Untitled Note",
            });
          }
        }
        setLocalTitle(activeNote.title || "");
        lastActiveNoteIdRef.current = activeNote.id;
      }
    } else {
      // If closing workspace, check if there was a modified title to save
      if (lastActiveNoteIdRef.current) {
        const oldNoteId = lastActiveNoteIdRef.current;
        const oldNote = (notes || []).find((n) => n.id === oldNoteId);
        if (oldNote && oldNote.title !== localTitle) {
          updateSecureNote(oldNoteId, { title: localTitle || "Untitled Note" });
        }
      }
      setLocalTitle("");
      lastActiveNoteIdRef.current = null;
    }
  }, [activeNote?.id, notes]);

  const FOLDER_COLORS = [
    "#EF4444",
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#8B5CF6",
    "#EC4899",
    "#888888",
  ];

  // Global click listener to dismiss custom menus
  useEffect(() => {
    const handleGlobalClick = () => {
      setContextMenu(null);
      setMoreDropdownId(null);
    };
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  // Post-process preview container to find <pre> elements and attach copy buttons elegantly
  useEffect(() => {
    if (activeNoteMode !== "view" || !previewRef.current || !activeNote) return;

    const copyIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
    const checkIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;

    const preElements = previewRef.current.querySelectorAll("pre");
    preElements.forEach((pre) => {
      // Ensure we don't double wrap or double process
      if (
        pre.parentElement &&
        pre.parentElement.classList.contains("vault-pre-wrapper")
      ) {
        return;
      }

      const wrapper = document.createElement("div");
      wrapper.className =
        "vault-pre-wrapper relative group my-4 rounded-lg overflow-hidden";

      // Place wrapper before pre in DOM
      pre.parentNode.insertBefore(wrapper, pre);
      // Move pre into wrapper
      wrapper.appendChild(pre);

      // Create Custom copy button with contrast background, zero border & ring, custom pointer
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "absolute top-3 right-3 px-2.5 py-1.5 rounded-lg bg-[#2A2A2A] hover:bg-[#333333] active:bg-[#444444] text-zinc-400 hover:text-zinc-100 transition-all cursor-pointer select-none opacity-0 group-hover:opacity-100 flex items-center gap-1.5 duration-150 z-10";
      btn.style.border = "none";
      btn.style.outline = "none";
      btn.innerHTML = `${copyIconSvg}<span class="text-[11px] font-sans font-medium uppercase tracking-wider">Copy</span>`;

      // Copy click handler
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const codeText =
          pre.querySelector("code")?.innerText || pre.innerText || "";

        const copyToClipboard = (text) => {
          if (navigator.clipboard) {
            return navigator.clipboard.writeText(text);
          } else {
            const textarea = document.createElement("textarea");
            textarea.value = text;
            textarea.style.position = "fixed"; // Avoid scrolling view to bottom
            document.body.appendChild(textarea);
            textarea.select();
            try {
              document.execCommand("copy");
            } catch (err) {
              console.error("Fallback copy fails", err);
            }
            document.body.removeChild(textarea);
            return Promise.resolve();
          }
        };

        copyToClipboard(codeText).then(() => {
          btn.innerHTML = `${checkIconSvg}<span class="text-[11px] font-sans font-medium uppercase tracking-wider text-emerald-400">Copied</span>`;
          btn.classList.add("bg-[#141414]", "text-emerald-400");
          btn.classList.remove(
            "bg-[#2A2A2A]",
            "text-zinc-400",
            "hover:text-zinc-100",
          );

          setTimeout(() => {
            btn.innerHTML = `${copyIconSvg}<span class="text-[11px] font-sans font-medium uppercase tracking-wider">Copy</span>`;
            btn.classList.remove("bg-[#141414]", "text-emerald-400");
            btn.classList.add("bg-[#2A2A2A]", "text-zinc-400");
          }, 2000);
        });
      });

      wrapper.appendChild(btn);
    });
  }, [activeNoteMode, activeNote?.id, activeNote?.data]);

  // Filter notes in memory
  const filteredNotes = useMemo(() => {
    let list = [...notes];

    // Filter by Folder selection
    if (selectedFolderId === "favorites") {
      list = list.filter((n) => n.isFavorite);
    } else if (selectedFolderId !== "all") {
      list = list.filter((n) => n.folderId === Number(selectedFolderId));
    }

    // Filter in real-time by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((n) => n.title.toLowerCase().includes(q));
    }

    // Sort accordingly
    list.sort((a, b) => {
      if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      }
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    return list;
  }, [notes, selectedFolderId, searchQuery, sortBy]);

  // Handle click on card note item to open popup modal editor
  const handleSelectNote = async (noteHeader) => {
    setSaveStatus("idle");
    if (noteHeader.isLocked) {
      setLockNoteToUnlock(noteHeader);
      setLockPassphraseInput("");
      setLockError("");
      setUnlockTargetMode("view");
    } else {
      const fullNote = await getDecryptedNote(noteHeader.id);
      if (fullNote) {
        setActiveNote(fullNote);
        setActiveNoteMode("view");
      }
    }
  };

  // Create new note (and open instantly in popup editor modal)
  const handleAddNewNote = async () => {
    const folderNum =
      !isNaN(selectedFolderId) &&
      selectedFolderId !== "all" &&
      selectedFolderId !== "favorites"
        ? Number(selectedFolderId)
        : null;

    setSaveStatus("idle");
    const newNote = await addSecureNote("Untitled Note", "", folderNum, []);
    if (newNote) {
      setActiveNote(newNote);
      setActiveNoteMode("edit");
    }
  };

  // Handle title changes purely in memory for top performance
  const handleTitleChange = (e) => {
    if (!activeNote) return;
    const newTitle = e.target.value;
    setLocalTitle(newTitle);

    // Simply update active state locally for instant layout feedback (sidebar, tabs) without database lag
    setActiveNote((prev) => (prev ? { ...prev, title: newTitle } : null));
  };

  // Commit title to secured database
  const commitTitleToDatabase = async () => {
    if (!activeNote) return;
    const savedNote = (notes || []).find((n) => n.id === activeNote.id);
    if (savedNote && savedNote.title === localTitle) return; // avoid redundant writes

    setSaveStatus("saving");
    try {
      await updateSecureNote(activeNote.id, {
        title: localTitle || "Untitled Note",
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
    }
  };

  // Inline Card Double-Click Rename
  const handleInlineRename = async (noteId, newTitle) => {
    if (!newTitle.trim()) {
      setRenamingNoteId(null);
      return;
    }
    await updateSecureNote(noteId, { title: newTitle });
    if (activeNote && activeNote.id === noteId) {
      setActiveNote((prev) => (prev ? { ...prev, title: newTitle } : null));
    }
    setRenamingNoteId(null);
  };

  // Duplicate secure item
  const handleDuplicateNote = async (noteId) => {
    const targetNote = notes.find((n) => n.id === noteId);
    if (targetNote && targetNote.isLocked) {
      setLockNoteToUnlock(targetNote);
      setLockPassphraseInput("");
      setLockError("");
      setUnlockTargetMode("duplicate");
      return;
    }
    const fullNote = await getDecryptedNote(noteId);
    if (fullNote) {
      await addSecureNote(
        `${fullNote.title} (Copy)`,
        fullNote.data,
        fullNote.folderId,
        fullNote.tags,
      );
    }
  };

  // Move note to specific folder
  const handleMoveToFolder = async (noteId, folderId) => {
    await updateSecureNote(noteId, {
      folderId: folderId ? Number(folderId) : null,
    });
    if (activeNote && activeNote.id === noteId) {
      setActiveNote((prev) =>
        prev ? { ...prev, folderId: folderId ? Number(folderId) : null } : null,
      );
    }
  };

  // Toggle Favorite
  const handleToggleFavorite = async (noteId) => {
    await toggleSecureFavorite(noteId);
    // Sync state if currently open in modal editor
    if (activeNote && activeNote.id === noteId) {
      setActiveNote((prev) =>
        prev ? { ...prev, isFavorite: !prev.isFavorite } : null,
      );
    }
  };

  // Toggle item lock flag
  const handleToggleLock = async (noteId) => {
    const target = notes.find((n) => n.id === noteId);
    if (target) {
      if (!target.isLocked) {
        setLockNoteToSecure(target);
        setNewLockPassphrase("");
        setNewLockPassphraseConfirm("");
        setNewLockHint("");
        setNewLockError("");
      } else {
        setLockNoteToUnlockForRemoval(target);
        setRemoveLockPassphraseInput("");
        setRemoveLockError("");
      }
    }
  };

  // EXPORTS
  const exportAsTxt = (noteObj) => {
    const plain = noteObj.data ? noteObj.data.replace(/<[^>]*>/g, "") : "";
    const blob = new Blob([plain], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${noteObj.title || "Untitled"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsHtml = (noteObj) => {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${noteObj.title || "Untitled"}</title>
  <style>
    body { font-family: -apple-system, sans-serif; padding: 40px; color: #1a1a1a; max-width: 700px; margin: auto; line-height: 1.7; }
    h1 { font-weight: 600; font-size: 2.2em; }
    blockquote { border-left: 3px solid #E5E5E5; padding-left: 15px; font-style: italic; color: #666; }
    pre { background: #f5f5f5; padding: 15px; border-radius: 8px; font-family: monospace; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #E5E5E5; padding: 10px; text-align: left; }
    th { background: #f9f9f9; }
  </style>
</head>
<body>
  <h1>${noteObj.title || "Untitled"}</h1>
  ${noteObj.data || ""}
</body>
</html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${noteObj.title || "Untitled"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (noteObj) => {
    const plain = noteObj.data ? noteObj.data.replace(/<[^>]*>/g, "") : "";
    navigator.clipboard.writeText(plain);
  };

  // Format date correctly
  const formatDateFriendly = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return `Today, ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
    }
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Right-click custom context menu trigger on card (BUG 2)
  const handleContextMenu = (e, noteId, noteTitle) => {
    e.preventDefault();
    e.stopPropagation();

    const menuHeight = 360; // estimated maximum menu height px
    const menuWidth = 200; // estimated maximum menu width px
    const padding = 8; // padding from edges

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    let x = e.clientX;
    let y = e.clientY;

    // If menu would go below viewport: show ABOVE cursor instead
    if (y + menuHeight > viewportHeight - padding) {
      y = y - menuHeight;
    }

    // If menu would go off right edge: show to the LEFT of cursor
    if (x + menuWidth > viewportWidth - padding) {
      x = x - menuWidth;
    }

    // Ensure never goes off viewport boundaries
    y = Math.max(padding, y);
    x = Math.max(padding, x);

    setContextMenu({
      x,
      y,
      noteId,
      noteTitle,
    });
  };

  const currentFolderObj = useMemo(() => {
    if (!activeNote) return null;
    return folders.find((f) => f.id === activeNote.folderId);
  }, [activeNote, folders]);

  // Strip html for plaintext snippet preview
  const getContentSnippet = (htmlContent) => {
    if (!htmlContent) return "No content";
    const clean = htmlContent.replace(/<[^>]*>/g, "");
    return clean.slice(0, 120) || "No text content";
  };

  const handleCreateFolderSubmit = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    await addFolder(newFolderName.trim(), newFolderColor);
    setNewFolderName("");
    setNewFolderColor("#888888");
    setShowFolderModal(false);
  };

  const viewMode = useUiStore(s => s.folderViews['notes'] || s.viewMode);

  return (
    <div className="h-[calc(100vh-80px)] w-full flex flex-col md:flex-row rounded-xl overflow-hidden bg-white dark:bg-[#1E1E1E] select-none font-sans relative">
      {/* PANEL 1: FOLDERS RAIL (Left Sidebar, Categorization Classification without borders) */}
      <div className="w-full md:w-[220px] bg-[#F5F5F5] dark:bg-[#1C1C1C] flex flex-col p-4 flex-shrink-0 gap-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold tracking-[0.06em] text-[#9B9B9B] dark:text-[#6B6B6B] uppercase">
            Categories
          </span>
          <button
            type="button"
            onClick={() => setShowFolderModal(true)}
            className="text-[#9B9B9B] hover:text-[#1A1A1A] dark:hover:text-[#F0F0F0] hover:bg-[#EEEEEE] dark:hover:bg-[#252525] p-1 rounded transition-all cursor-pointer focus:outline-none"
            title="Create Folder"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
        </div>

        {/* Categories filters lists */}
        <div className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-1 md:pb-0 custom-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedFolderId("all")}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add("bg-zinc-200", "dark:bg-[#333333]");
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove(
                "bg-zinc-200",
                "dark:bg-[#333333]",
              );
            }}
            onDrop={async (e) => {
              e.preventDefault();
              e.currentTarget.classList.remove(
                "bg-zinc-200",
                "dark:bg-[#333333]",
              );
              const noteIdStr = e.dataTransfer.getData("text/plain");
              if (noteIdStr) {
                await handleMoveToFolder(Number(noteIdStr), null);
              }
            }}
            className={`flex-shrink-0 md:flex-shrink flex items-center gap-2 px-3 h-8 rounded-md text-[13px] font-medium cursor-pointer transition-all ${
              selectedFolderId === "all"
                ? "bg-white dark:bg-[#252525] text-[#1A1A1A] dark:text-[#F0F0F0]"
                : "text-[#6B6B6B] dark:text-[#888888] hover:bg-[#EEEEEE] dark:hover:bg-[#252525]/50"
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-zinc-500" />
            <span>All Notes</span>
            <span className="ml-auto text-[10px] font-mono text-zinc-400 font-semibold md:block hidden">
              {notes.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFolderId("favorites")}
            className={`flex-shrink-0 md:flex-shrink flex items-center gap-2 px-3 h-8 rounded-md text-[13px] font-medium cursor-pointer transition-all ${
              selectedFolderId === "favorites"
                ? "bg-white dark:bg-[#252525] text-[#1A1A1A] dark:text-[#F0F0F0]"
                : "text-[#6B6B6B] dark:text-[#888888] hover:bg-[#EEEEEE] dark:hover:bg-[#252525]/50"
            }`}
          >
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500/10" />
            <span>Starred</span>
            <span className="ml-auto text-[10px] font-mono text-zinc-400 font-semibold md:block hidden">
              {notes.filter((n) => n.isFavorite).length}
            </span>
          </button>
        </div>

        {/* User flat dynamic folders */}
        <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add(
                "bg-zinc-200/50",
                "dark:bg-[#252525]/50",
              );
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove(
                "bg-zinc-200/50",
                "dark:bg-[#252525]/50",
              );
            }}
            onDrop={async (e) => {
              e.preventDefault();
              e.currentTarget.classList.remove(
                "bg-zinc-200/50",
                "dark:bg-[#252525]/50",
              );
              const folderIdStr = e.dataTransfer.getData("folderId");
              if (folderIdStr) {
                // Relocate folder to top-level root (parentId = null)
                await updateSecureFolder(Number(folderIdStr), {
                  parentId: null,
                });
              }
            }}
            className="flex items-center justify-between px-1 mb-1 rounded p-1 transition-colors"
          >
            <span className="text-[10px] text-[#9B9B9B] dark:text-[#6B6B6B] font-semibold uppercase tracking-wider block">
              My Folders
            </span>
            <button
              type="button"
              onClick={() => {
                setIsManageFolders(!isManageFolders);
                setSelectedFolderIds(new Set());
              }}
              className="text-[10px] font-semibold text-zinc-500 hover:text-[#1A1A1A] dark:hover:text-[#F0F0F0] cursor-pointer"
            >
              {isManageFolders ? "Done" : "Manage"}
            </button>
          </div>

          {/* Bulk management buttons bar */}
          {isManageFolders && folders.length > 0 && (
            <div className="px-2 py-2 bg-zinc-200/50 dark:bg-[#222222] rounded-md flex flex-col gap-1.5 select-none mb-1">
              <div className="flex items-center justify-between text-[11px] font-medium text-zinc-650 dark:text-zinc-400">
                <span>Selected: {selectedFolderIds.size}</span>
                <button
                  type="button"
                  onClick={handleToggleSelectAllFolders}
                  className="text-zinc-800 dark:text-zinc-200 hover:underline cursor-pointer font-semibold"
                >
                  {selectedFolderIds.size === folders.length
                    ? "Deselect All"
                    : "Select All"}
                </button>
              </div>
              <button
                type="button"
                onClick={handleBulkDeleteFolders}
                disabled={selectedFolderIds.size === 0}
                className="w-full h-7 px-2 bg-[#1A1A1A] hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-[#141414] disabled:opacity-40 disabled:cursor-not-allowed text-[11px] font-semibold rounded flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete Selected</span>
              </button>
            </div>
          )}

          <div className="space-y-0.5 animate-fade-in">
            {folders.length === 0 ? (
              <span className="text-[11px] text-zinc-400 italic block px-2 mt-1">
                No custom folders
              </span>
            ) : (
              folders.map((f) => {
                const count = notes.filter((n) => n.folderId === f.id).length;
                const isSelected = selectedFolderIds.has(f.id);

                return (
                  <FolderItem
                    key={f.id}
                    folder={{ ...f, itemCount: count }}
                    isActive={selectedFolderId === f.id.toString()}
                    isDragged={draggedId === f.id}
                    isDragOver={dragOverId === f.id}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                    onContextMenu={openFolderMenu}
                    onClick={(folder) =>
                      setSelectedFolderId(folder.id.toString())
                    }
                    editingFolderId={editingFolderId}
                    onRename={handleRenameFolder}
                    onRenameCancel={() => setEditingFolderId(null)}
                    isManageFolders={isManageFolders}
                    isSelected={isSelected}
                    onToggleSelect={(fid) => {
                      setSelectedFolderIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(fid)) next.delete(fid);
                        else next.add(fid);
                        return next;
                      });
                    }}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* MAIN PANE: NOTES FULL BOARD GRID DASHBOARD (contrasting bg with categories rail) */}
      <div className="flex-1 bg-[#FAFAFA] dark:bg-[#141414] flex flex-col overflow-hidden">
        {/* Dynamic header options row */}
        <div className="p-6 pb-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[24px] font-semibold text-[#1A1A1A] dark:text-[#F0F0F0]">
              {selectedFolderId === "all" && "All Notes"}
              {selectedFolderId === "favorites" && "Starred"}
              {isNaN(selectedFolderId) === false &&
                (folders.find((f) => f.id === Number(selectedFolderId))?.name ||
                  "Folder Notes")}
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#EEEEEE] dark:bg-[#2A2A2A] text-zinc-650 dark:text-zinc-400 font-semibold whitespace-nowrap">
              {filteredNotes.length}{" "}
              {filteredNotes.length === 1 ? "note" : "notes"}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            {/* Search Input Box */}
            <div className="relative flex items-center bg-white dark:bg-[#1E1E1E] px-3 h-10 sm:h-9 rounded-lg text-zinc-400 w-full sm:w-[240px]">
              <Search className="w-3.5 h-3.5 flex-shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes..."
                className="w-full text-xs font-sans pl-2 bg-transparent border-0 text-[#1A1A1A] dark:text-[#F0F0F0] placeholder-zinc-400 focus:ring-0 focus:outline-none select-text"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="hover:text-[#1A1A1A] dark:hover:text-white cursor-pointer p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto mt-1 sm:mt-0">
              {/* Sort Dropdown Selector */}
              <div className="bg-white dark:bg-[#1E1E1E] px-3 h-10 sm:h-9 rounded-lg flex items-center flex-1 sm:flex-none justify-center">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 border-0 bg-transparent focus:ring-0 focus:outline-none cursor-pointer p-0 w-full text-center sm:text-left"
                  name="notesGridSort"
                >
                  <option
                    value="updatedAt"
                    className="bg-white dark:bg-[#1E1E1E]"
                  >
                    Recent
                  </option>
                  <option value="title" className="bg-white dark:bg-[#1E1E1E]">
                    Title
                  </option>
                </select>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-white dark:bg-[#1E1E1E] p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => useUiStore.getState().setFolderView('notes', 'grid')}
                  className={`p-1.5 rounded-md transition-colors cursor-pointer focus:outline-none ${viewMode === 'grid' ? 'bg-[#F5F5F5] dark:bg-[#2A2A2A] text-[#1A1A1A] dark:text-[#F0F0F0]' : 'text-zinc-400 hover:text-[#1A1A1A] dark:hover:text-[#F0F0F0]'}`}
                >
                  <LayoutGrid className="w-3.5 h-3.5 stroke-[2]" />
                </button>
                <button
                  type="button"
                  onClick={() => useUiStore.getState().setFolderView('notes', 'list')}
                  className={`p-1.5 rounded-md transition-colors cursor-pointer focus:outline-none ${viewMode === 'list' ? 'bg-[#F5F5F5] dark:bg-[#2A2A2A] text-[#1A1A1A] dark:text-[#F0F0F0]' : 'text-zinc-400 hover:text-[#1A1A1A] dark:hover:text-[#F0F0F0]'}`}
                >
                  <List className="w-3.5 h-3.5 stroke-[2]" />
                </button>
              </div>

              {/* Add Action Action Card Button */}
              <button
                type="button"
                onClick={handleAddNewNote}
                className="h-10 sm:h-9 px-4 flex items-center justify-center gap-2 bg-[#1A1A1A] dark:bg-[#F0F0F0] hover:bg-zinc-805 dark:hover:bg-white text-white dark:text-[#141414] text-xs font-semibold rounded-lg transition-colors cursor-pointer focus:outline-none flex-1 sm:flex-none whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Create Note</span>
              </button>
            </div>
          </div>
        </div>

        {/* Secure Notes Cards Area (thinner scrollbar applied) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {/* Selection toolbar — shows when notes selected */}
          {selectedNoteIds.size > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-[#242424] rounded-xl mb-3 animate-fade-in">
              {/* Count */}
              <span className="text-[13px] text-[#C0C0C0] font-medium">
                {selectedNoteIds.size} selected
              </span>

              {/* Select All */}
              <button
                type="button"
                onClick={() => {
                  const allIds = new Set(notes.map((n) => n.id));
                  setSelectedNoteIds(allIds);
                }}
                className="text-[12px] text-[#888888] hover:text-[#C0C0C0] cursor-pointer transition-colors px-2 py-1 rounded-lg hover:bg-[#2A2A2A]"
              >
                Select all
              </button>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Delete button — THIS IS THE CRITICAL FIX */}
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium cursor-pointer transition-all duration-150 ${
                  isBulkDeleting
                    ? "opacity-50 cursor-not-allowed text-[#888888]"
                    : "text-red-400 hover:text-red-300 hover:bg-red-500/10"
                }`}
              >
                {isBulkDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete {selectedNoteIds.size} note
                    {selectedNoteIds.size > 1 ? "s" : ""}
                  </>
                )}
              </button>

              {/* Cancel selection */}
              <button
                type="button"
                onClick={() => setSelectedNoteIds(new Set())}
                className="flex items-center gap-1 text-[13px] text-[#666666] hover:text-[#C0C0C0] cursor-pointer transition-colors px-2 py-1 rounded-lg hover:bg-[#2A2A2A]"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          )}

          {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-zinc-400 mt-16 max-w-sm mx-auto gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#F5F5F5] dark:bg-[#1E1E1E] flex items-center justify-center">
                <FileText className="w-7 h-7 text-[#1A1A1A] dark:text-[#F0F0F0] stroke-[1.5]" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[#1A1A1A] dark:text-[#F0F0F0]">
                  No notes matching filters
                </div>
                <div className="text-xs text-[#9B9B9B] dark:text-[#6B6B6B] mt-1 leading-relaxed">
                  Get started by adding a brand new encrypted record in your
                  Vault, or clear searching fields.
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddNewNote}
                className="h-9 px-4 inline-flex items-center gap-2 bg-[#1A1A1A] dark:bg-[#F0F0F0] text-xs text-white dark:text-[#141414] font-semibold rounded-lg hover:opacity-90 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Create a note</span>
              </button>
            </div>
          ) : (
            <div className={`grid gap-4 pb-12 ${
              viewMode === 'list' 
                ? 'grid-cols-1' 
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            }`}>
              {filteredNotes.map((note) => {
                const noteFolder = folders.find((f) => f.id === note.folderId);
                const isRenaming = renamingNoteId === note.id;
                const isSelected = selectedNoteIds.has(note.id);

                return (
                  <div
                    key={note.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", note.id.toString());
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onClick={() => {
                      if (!isRenaming) {
                        if (selectedNoteIds.size > 0) {
                          toggleSelectNote(note.id);
                        } else {
                          handleSelectNote(note);
                        }
                      }
                    }}
                    onContextMenu={(e) =>
                      handleContextMenu(e, note.id, note.title)
                    }
                    className={`group relative rounded-xl overflow-hidden cursor-pointer select-none transition-all duration-150 ease-out p-5 flex flex-col justify-between min-h-[160px] ${
                      isSelected
                        ? "scale-[0.96] bg-[#2A2A2A]"
                        : "scale-100 bg-white dark:bg-[#1E1E1E] hover:bg-[#EEEEEE]/40 dark:hover:bg-[#252525]/70 hover:scale-[0.99]"
                    }`}
                    title="Drag onto sidebar folder to classify, click to view & edit, double click title to rename"
                  >
                    {/* Checkbox — shows when selected or in select mode */}
                    {(isSelectMode || isSelected) && (
                      <div
                        className="absolute top-3 left-3 z-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectNote(note.id);
                        }}
                      >
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 ease-out cursor-pointer ${
                            isSelected
                              ? "bg-white scale-100 text-black"
                              : "bg-black/20 dark:bg-black/40 scale-90 group-hover:scale-100 text-transparent"
                          }`}
                        >
                          {isSelected && (
                            <svg width="10" height="10" viewBox="0 0 10 10">
                              <path
                                d="M2 5l2.5 2.5L8 3"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                fill="none"
                              />
                            </svg>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Top title area */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 font-semibold text-[15px] text-[#1A1A1A] dark:text-[#F0F0F0] truncate">
                          {isRenaming ? (
                            <input
                              type="text"
                              value={renamingTitle}
                              onChange={(e) => setRenamingTitle(e.target.value)}
                              onKeyDown={async (e) => {
                                if (e.key === "Enter") {
                                  await handleInlineRename(
                                    note.id,
                                    renamingTitle,
                                  );
                                } else if (e.key === "Escape") {
                                  setRenamingNoteId(null);
                                }
                              }}
                              onBlur={async () => {
                                await handleInlineRename(
                                  note.id,
                                  renamingTitle,
                                );
                              }}
                              className="bg-transparent border-0 font-semibold text-[15px] text-[#1A1A1A] dark:text-[#F0F0F0] p-0 focus:ring-0 focus:outline-none w-full select-text"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                if (note.isLocked) {
                                  setLockNoteToUnlock(note);
                                  setLockPassphraseInput("");
                                  setLockError("");
                                  setUnlockTargetMode("view");
                                } else {
                                  setRenamingNoteId(note.id);
                                  setRenamingTitle(note.title);
                                }
                              }}
                              className="block truncate"
                            >
                              {note.title || "Untitled Note"}
                            </span>
                          )}
                        </div>

                        {/* Status badges */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {note.isLocked && (
                            <Lock className="w-3.5 h-3.5 text-zinc-400" />
                          )}
                          {note.isFavorite && (
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          )}
                        </div>
                      </div>

                      {/* Content snippet rendering with fallback */}
                      <p className="text-[13px] text-[#888888] dark:text-[#666666] line-clamp-3 leading-relaxed break-words">
                        {note.isLocked ? (
                          <span className="flex items-center gap-1.5 text-[#888888] dark:text-[#555555]">
                            <Lock className="w-3.5 h-3.5 text-[#888888] dark:text-[#555555] flex-shrink-0" />
                            <span>
                              Locked with Passphrase. Enter passphrase to
                              decrypt.
                            </span>
                          </span>
                        ) : (
                          note.preview || (
                            <span className="italic text-[#666666] dark:text-[#444444]">
                              Empty note
                            </span>
                          )
                        )}
                      </p>
                    </div>

                    {/* Footer tags and classification */}
                    <div className="mt-4 pt-3 flex items-center justify-between animate-fade-in">
                      <span className="text-[11px] text-[#9B9B9B] dark:text-[#6B6B6B] font-medium">
                        {formatDateFriendly(note.updatedAt)}
                      </span>

                      {noteFolder && (
                        <span
                          className="flex items-center gap-1.5 text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-md"
                          style={{
                            color: getFolderColor(noteFolder.color),
                            backgroundColor: `${getFolderColor(noteFolder.color)}15`,
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{
                              backgroundColor: getFolderColor(noteFolder.color),
                            }}
                          />
                          {noteFolder.name}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ==========================================================================
         POPUP SECURE RICH NOTE WORKSPACE MODAL (DUAL VIEW & EDIT MODES)
         ========================================================================== */}
      {activeNote && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/85 flex items-center justify-center p-3 md:p-8 z-50 animate-fade-in select-none">
          <div className="w-full max-w-5xl h-[88vh] bg-white dark:bg-[#1E1E1E] rounded-xl flex flex-col overflow-hidden animate-slide-up relative">
            {/* MODAL TOP ACTIONS STEER (With traditional Vault light-gray/dark-gray contrast) */}
            <div className="h-14 px-6 bg-[#F5F5F5] dark:bg-[#1C1C1C] flex items-center justify-between flex-shrink-0 z-10 select-none">
              <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium truncate">
                <FileText className="w-4 h-4 text-[#1A1A1A] dark:text-white" />
                <span>Notes Workspace</span>
                <ChevronRight className="w-3 h-3" />

                {activeNoteMode === "view" ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider text-[10px] bg-emerald-500/10 dark:bg-emerald-500/15 px-1.5 py-0.5 rounded-md flex-shrink-0">
                    View Sheet
                  </span>
                ) : (
                  <span className="text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider text-[10px] bg-zinc-500/10 dark:bg-zinc-500/15 px-1.5 py-0.5 rounded-md flex-shrink-0">
                    Editor
                  </span>
                )}

                <ChevronRight className="w-3 h-3 flex-shrink-0" />
                <span className="text-[#1A1A1A] dark:text-[#F0F0F0] font-semibold truncate">
                  {activeNote.title || "Untitled Note"}
                </span>
              </div>

              {/* EDITOR/VIEWER ACTION BUTTONS */}
              <div className="flex items-center gap-2">
                {/* Dual Mode Switch Button */}
                {activeNoteMode === "view" ? (
                  <button
                    type="button"
                    onClick={() => setActiveNoteMode("edit")}
                    className="h-8 px-3 flex items-center gap-1.5 bg-[#EEEEEE] dark:bg-[#2A2A2A] hover:bg-[#E5E5E5] dark:hover:bg-[#333333] text-zinc-850 dark:text-[#F0F0F0] text-xs font-semibold rounded-md cursor-pointer transition-colors active:scale-95"
                    title="Switch to Editor"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit Note</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      // Save and instantly lock/sync with view sheet
                      commitTitleToDatabase();
                      setActiveNoteMode("view");
                    }}
                    className="h-8 px-3.5 flex items-center gap-1.5 bg-[#1A1A1A] dark:bg-[#333333] hover:opacity-90 text-white rounded-md text-xs font-semibold cursor-pointer select-none transition-all outline-none"
                    title="Save Changes & View"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Save Note</span>
                  </button>
                )}

                {/* Save status badge indicator if editing */}
                {activeNoteMode === "edit" && (
                  <span className="hidden sm:inline text-xs text-zinc-400 font-medium mr-1 select-none">
                    {saveStatus === "saving" && "Saving..."}
                    {saveStatus === "saved" && "Saved"}
                  </span>
                )}

                {/* Star icon toggle */}
                <button
                  type="button"
                  onClick={() => handleToggleFavorite(activeNote.id)}
                  className={`p-2 rounded cursor-pointer transition-all focus:outline-none ${
                    activeNote.isFavorite
                      ? "text-amber-500 bg-[#EEEEEE] dark:bg-[#2A2A2A]"
                      : "text-zinc-400 hover:text-amber-500 hover:bg-[#EEEEEE] dark:hover:bg-[#2A2A2A]"
                  }`}
                  title={
                    activeNote.isFavorite ? "Remove from Starred" : "Star Note"
                  }
                >
                  <Star
                    className={`w-4 h-4 ${activeNote.isFavorite ? "fill-amber-500" : ""}`}
                  />
                </button>

                {/* Secure key toggle lock */}
                <button
                  type="button"
                  onClick={() => handleToggleLock(activeNote.id)}
                  className={`p-2 rounded cursor-pointer transition-all focus:outline-none ${
                    activeNote.isLocked
                      ? "text-[#1A1A1A] dark:text-white bg-[#EEEEEE] dark:bg-[#2A2A2A]"
                      : "text-zinc-400 hover:text-[#1A1A1A] dark:hover:text-white hover:bg-[#EEEEEE] dark:hover:bg-[#2A2A2A]"
                  }`}
                  title={
                    activeNote.isLocked
                      ? "Unlock document file"
                      : "Secure with passphrase lock"
                  }
                >
                  {activeNote.isLocked ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    <Unlock className="w-4 h-4" />
                  )}
                </button>

                {/* Extra tools / operations dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (moreDropdownId === activeNote.id) {
                        setMoreDropdownId(null);
                      } else {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setMoreDropdownPos({
                          top: rect.bottom + 4,
                          right: window.innerWidth - rect.right,
                        });
                        setMoreDropdownId(activeNote.id);
                      }
                    }}
                    className="p-2 rounded text-zinc-400 hover:text-[#1A1A1A] dark:hover:text-[#F0F0F0] hover:bg-[#EEEEEE] dark:hover:bg-[#2A2A2A] transition-all cursor-pointer focus:outline-none"
                    title="Vault Operations"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  {moreDropdownId === activeNote.id &&
                    createPortal(
                      <>
                        {/* Fullscreen overlay to close the dropdown */}
                        <div
                          className="fixed inset-0 z-[9998]"
                          onClick={() => setMoreDropdownId(null)}
                        />

                        <div
                          style={{
                            position: "fixed",
                            right: `${moreDropdownPos.right}px`,
                            top: `${moreDropdownPos.top}px`,
                            zIndex: 9999,
                          }}
                          className="w-52 py-1.5 bg-white dark:bg-[#1E1E1E] rounded-lg shadow-lg font-sans text-xs max-h-[360px] overflow-y-auto custom-scrollbar select-none"
                        >
                          {activeNoteMode === "view" && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveNoteMode("edit");
                                  setMoreDropdownId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-zinc-700 dark:text-zinc-300 hover:bg-[#EEEEEE] dark:hover:bg-[#2A2A2A] transition-colors flex items-center gap-2 cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5 text-zinc-400 font-semibold" />
                                <span>Switch to Editor</span>
                              </button>
                              <div className="my-1 h-px bg-zinc-100 dark:bg-[#2A2A2A] mx-4" />
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              handleDuplicateNote(activeNote.id);
                              setMoreDropdownId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-zinc-700 dark:text-zinc-300 hover:bg-[#EEEEEE] dark:hover:bg-[#2A2A2A] transition-colors flex items-center gap-2 cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Duplicate Note</span>
                          </button>

                          <div className="my-1.5 h-px bg-zinc-100 dark:bg-[#2A2A2A] mx-4" />
                          <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block px-4 py-1">
                            Move Destination
                          </span>

                          <div className="flex flex-col">
                            <button
                              type="button"
                              onClick={() => {
                                handleMoveToFolder(activeNote.id, null);
                                setMoreDropdownId(null);
                              }}
                              className="w-full px-4 py-1.5 text-left text-zinc-700 dark:text-zinc-300 hover:bg-[#EEEEEE] dark:hover:bg-[#2A2A2A] transition-colors flex items-center gap-2 cursor-pointer text-xs"
                            >
                              <Folder
                                className="w-3.5 h-3.5 flex-shrink-0"
                                style={{ color: "currentColor" }}
                              />
                              <span>No Classification</span>
                            </button>

                            {folders.map((f) => (
                              <button
                                key={f.id}
                                type="button"
                                onClick={() => {
                                  handleMoveToFolder(activeNote.id, f.id);
                                  setMoreDropdownId(null);
                                }}
                                className="w-full px-4 py-1.5 text-left text-zinc-700 dark:text-zinc-300 hover:bg-[#EEEEEE] dark:hover:bg-[#2A2A2A] transition-colors flex items-center gap-2 cursor-pointer text-xs"
                              >
                                <Folder
                                  className="w-3.5 h-3.5 flex-shrink-0"
                                  style={{ color: getFolderColor(f.color) }}
                                />
                                <span className="truncate">{f.name}</span>
                              </button>
                            ))}
                          </div>

                          <div className="my-1.5 h-px bg-zinc-100 dark:bg-[#2A2A2A] mx-4" />
                          <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block px-4 py-1">
                            Offline Exports
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              exportAsTxt(activeNote);
                              setMoreDropdownId(null);
                            }}
                            className="w-full px-4 py-1.5 text-left text-zinc-700 dark:text-zinc-300 hover:bg-[#EEEEEE] dark:hover:bg-[#2A2A2A] transition-colors flex items-center gap-2 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Export plaintext (.txt)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              exportAsHtml(activeNote);
                              setMoreDropdownId(null);
                            }}
                            className="w-full px-4 py-1.5 text-left text-zinc-700 dark:text-zinc-300 hover:bg-[#EEEEEE] dark:hover:bg-[#2A2A2A] transition-all flex items-center gap-2 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Export HTML (.html)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              copyToClipboard(activeNote);
                              setMoreDropdownId(null);
                            }}
                            className="w-full px-4 py-1.5 text-left text-zinc-700 dark:text-zinc-300 hover:bg-[#EEEEEE] dark:hover:bg-[#2A2A2A] transition-all flex items-center gap-2 cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Copy to Clipboard</span>
                          </button>

                          <div className="my-1.5 h-px bg-zinc-100 dark:bg-[#2A2A2A] mx-4" />
                          <button
                            type="button"
                            onClick={() => {
                              setNoteToDelete({
                                id: activeNote.id,
                                title: activeNote.title,
                              });
                              setMoreDropdownId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-red-650 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all flex items-center gap-2 font-semibold cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            <span>Purge permanently</span>
                          </button>
                        </div>
                      </>,
                      document.body,
                    )}
                </div>

                {/* Big Close & Save dismiss button */}
                <button
                  type="button"
                  onClick={() => {
                    commitTitleToDatabase();
                    setActiveNote(null);
                  }}
                  className="p-2 rounded text-[#9B9B9B] hover:text-[#1A1A1A] dark:hover:text-[#F0F0F0] hover:bg-[#EEEEEE] dark:hover:bg-[#252525] transition-all cursor-pointer focus:outline-none"
                  title="Close Workspace"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {activeNoteMode === "view" ? (
              /* ==============================================
                 READ-ONLY VIEW SHEET LAYOUT
                 ============================================== */
              <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col px-8 py-6 select-text">
                {/* Title display */}
                <h1 className="font-semibold text-3xl text-[#1A1A1A] dark:text-[#F0F0F0] mb-3 select-text select-text block break-words">
                  {activeNote.title || "Untitled Note"}
                </h1>

                {/* Document metadata info trackers */}
                <div className="flex flex-wrap items-center gap-4 text-[10px] text-[#9B9B9B] dark:text-[#6B6B6B] font-semibold uppercase tracking-wider select-none mb-6">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      Created {formatDateFriendly(activeNote.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      Edited {formatDateFriendly(activeNote.updatedAt)}
                    </span>
                  </div>
                  {currentFolderObj && (
                    <div className="flex items-center gap-1.5">
                      <Folder
                        className="w-3.5 h-3.5"
                        style={{
                          color: getFolderColor(currentFolderObj.color),
                        }}
                      />
                      <span>Folder: {currentFolderObj.name}</span>
                    </div>
                  )}
                </div>

                <div className="mb-6 h-px bg-[#E5E5E5]/40 dark:bg-[#2A2A2A]/40" />

                {/* Content preview container leveraging tiptap style classes cleanly */}
                <div
                  ref={previewRef}
                  className="flex-1 bg-white dark:bg-[#1E1E1E] select-text pt-4"
                >
                  <NoteEditor note={activeNote} readOnly={true} />
                </div>
              </div>
            ) : (
              /* ==============================================
                 INTERACTIVE EDITOR WORKSPACE LAYOUT
                 ============================================== */
              <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                {/* Title Input area on editor */}
                <div className="px-8 pt-6 pb-2.5 flex flex-col gap-3 flex-shrink-0">
                  <input
                    type="text"
                    value={localTitle}
                    onChange={(e) => setLocalTitle(e.target.value)}
                    onBlur={commitTitleToDatabase}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        commitTitleToDatabase();
                      }
                    }}
                    placeholder="Note title..."
                    className="w-full font-semibold text-2xl text-[#1A1A1A] dark:text-white placeholder-zinc-300 dark:placeholder-zinc-700 bg-transparent border-0 focus:ring-0 focus:outline-none block p-0 select-text"
                  />

                  {/* Document metadata info trackers */}
                  <div className="flex flex-wrap items-center gap-4 text-[10px] text-[#9B9B9B] dark:text-[#6B6B6B] font-semibold uppercase tracking-wider select-none mt-1">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        Created {formatDateFriendly(activeNote.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        Edited {formatDateFriendly(activeNote.updatedAt)}
                      </span>
                    </div>
                    {currentFolderObj && (
                      <div className="flex items-center gap-1.5">
                        <Folder
                          className="w-3.5 h-3.5"
                          style={{
                            color: getFolderColor(currentFolderObj.color),
                          }}
                        />
                        <span>Folder: {currentFolderObj.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tiptap rich interactive workspace */}
                <div className="flex-1 bg-white dark:bg-[#1E1E1E] flex flex-col p-2">
                  <NoteEditor
                    note={activeNote}
                    onSave={updateSecureNote}
                    derivedKey={derivedKey}
                    saveStatus={saveStatus}
                    setSaveStatus={setSaveStatus}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================================================
         RIGHT-CLICK CONTEXT MENU AT POSITION
         ========================================================================== */}
      {contextMenu && (
        <div
          style={{
            position: "fixed",
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            zIndex: 9999,
          }}
          className="py-1.5 bg-white dark:bg-[#1E1E1E] rounded-lg text-xs font-sans min-w-[205px] max-h-[380px] overflow-y-auto custom-scrollbar shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Select Note Option — BUG 6 */}
          <button
            type="button"
            onClick={() => {
              handleSelectNoteId(contextMenu.noteId);
              setContextMenu(null);
            }}
            className="w-full px-3.5 py-1.5 text-left text-zinc-755 dark:text-zinc-200 hover:bg-[#EEEEEE] dark:hover:bg-[#2A2A2A] transition-colors flex items-center gap-2 cursor-pointer font-semibold text-xs"
          >
            <CheckSquare className="w-3.5 h-3.5 text-zinc-400" />
            <span>Select Note</span>
          </button>

          <div className="my-1 h-px bg-zinc-100 dark:bg-[#2A2A2A] mx-3.5" />

          {/* View Note Trigger Option */}
          <button
            type="button"
            onClick={async () => {
              const targetNote = notes.find((n) => n.id === contextMenu.noteId);
              if (targetNote) {
                if (targetNote.isLocked) {
                  setLockNoteToUnlock(targetNote);
                  setLockPassphraseInput("");
                  setLockError("");
                  setUnlockTargetMode("view");
                } else {
                  const fullNote = await getDecryptedNote(contextMenu.noteId);
                  if (fullNote) {
                    setActiveNote(fullNote);
                    setActiveNoteMode("view");
                  }
                }
              }
              setContextMenu(null);
            }}
            className="w-full px-3.5 py-1.5 text-left text-zinc-755 dark:text-zinc-200 hover:bg-[#EEEEEE] dark:hover:bg-[#2A2A2A] transition-colors flex items-center gap-2 cursor-pointer font-semibold text-xs"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-500" />
            <span>View Note</span>
          </button>

          {/* Edit Note Trigger Option */}
          <button
            type="button"
            onClick={async () => {
              const targetNote = notes.find((n) => n.id === contextMenu.noteId);
              if (targetNote) {
                if (targetNote.isLocked) {
                  setLockNoteToUnlock(targetNote);
                  setLockPassphraseInput("");
                  setLockError("");
                  setUnlockTargetMode("edit");
                } else {
                  const fullNote = await getDecryptedNote(contextMenu.noteId);
                  if (fullNote) {
                    setActiveNote(fullNote);
                    setActiveNoteMode("edit");
                  }
                }
              }
              setContextMenu(null);
            }}
            className="w-full px-3.5 py-1.5 text-left text-zinc-755 dark:text-zinc-200 hover:bg-[#EEEEEE] dark:hover:bg-[#2A2A2A] transition-colors flex items-center gap-2 cursor-pointer text-xs"
          >
            <Edit className="w-3.5 h-3.5 text-zinc-400" />
            <span>Edit Note</span>
          </button>

          <div className="my-1 h-px bg-zinc-100 dark:bg-[#2A2A2A] mx-3.5" />

          <button
            type="button"
            onClick={() => {
              handleToggleFavorite(contextMenu.noteId);
              setContextMenu(null);
            }}
            className="w-full px-3.5 py-1.5 text-left text-zinc-700 dark:text-zinc-300 hover:bg-[#EEEEEE] dark:hover:bg-[#2A2A2A] transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Star className="w-3.5 h-3.5 text-amber-500" />
            <span>Toggle Starred</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRenamingNoteId(contextMenu.noteId);
              setRenamingTitle(contextMenu.noteTitle || "");
              setContextMenu(null);
            }}
            className="w-full px-3.5 py-1.5 text-left text-zinc-700 dark:text-zinc-300 hover:bg-[#EEEEEE] dark:hover:bg-[#2A2A2A] transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Rename Entry</span>
          </button>

          <button
            type="button"
            onClick={() => {
              handleDuplicateNote(contextMenu.noteId);
              setContextMenu(null);
            }}
            className="w-full px-3.5 py-1.5 text-left text-zinc-700 dark:text-zinc-300 hover:bg-[#EEEEEE] dark:hover:bg-[#2A2A2A] transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Duplicate note</span>
          </button>

          <button
            type="button"
            onClick={() => {
              handleToggleLock(contextMenu.noteId);
              setContextMenu(null);
            }}
            className="w-full px-3.5 py-1.5 text-left text-zinc-700 dark:text-zinc-300 hover:bg-[#EEEEEE] dark:hover:bg-[#2A2A2A] transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Toggle lock passphrase</span>
          </button>

          <div className="my-1 h-px bg-zinc-100 dark:bg-[#2A2A2A] mx-3.5" />
          <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold px-3.5 py-1 block">
            Move directly to
          </span>

          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => {
                handleMoveToFolder(contextMenu.noteId, null);
                setContextMenu(null);
              }}
              className="w-full px-3.5 py-1.5 text-left text-zinc-700 dark:text-zinc-300 hover:bg-[#EEEEEE] dark:hover:bg-[#2A2A2A] transition-colors flex items-center gap-1.5 cursor-pointer text-xs"
            >
              <Folder
                className="w-3.5 h-3.5 flex-shrink-0"
                style={{ color: "currentColor" }}
              />
              <span>No classification</span>
            </button>

            {folders.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  handleMoveToFolder(contextMenu.noteId, f.id);
                  setContextMenu(null);
                }}
                className="w-full px-3.5 py-1.5 text-left text-zinc-700 dark:text-zinc-300 hover:bg-[#EEEEEE] dark:hover:bg-[#2A2A2A] transition-colors flex items-center gap-1.5 text-xs cursor-pointer"
              >
                <Folder
                  className="w-3.5 h-3.5 flex-shrink-0"
                  style={{ color: getFolderColor(f.color) }}
                />
                <span className="truncate">{f.name}</span>
              </button>
            ))}
          </div>

          <div className="my-1 h-px bg-zinc-100 dark:bg-[#2A2A2A] mx-3.5" />
          <button
            type="button"
            onClick={() => {
              setNoteToDelete({
                id: contextMenu.noteId,
                title: contextMenu.noteTitle,
              });
              setContextMenu(null);
            }}
            className="w-full px-3.5 py-1.5 text-left text-red-650 dark:text-red-405 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors flex items-center gap-2 font-semibold cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
            <span>Delete Permanently</span>
          </button>
        </div>
      )}

      {/* ==========================================================================
         NEW CATEGORY FOLDER MODAL CONTAINER (No borders)
         ========================================================================== */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in select-none">
          <div className="w-[360px] bg-white dark:bg-[#1E1E1E] rounded-xl p-6 shadow-none font-sans">
            <h3 className="text-md font-semibold text-zinc-805 dark:text-zinc-100 flex items-center gap-2">
              <FolderPlus className="w-4.5 h-4.5 text-[#1A1A1A] dark:text-white" />
              <span>New Category Folder</span>
            </h3>

            <form
              onSubmit={handleCreateFolderSubmit}
              className="space-y-4 mt-4"
            >
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  Folder name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Personal, Work, Credentials"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-lg bg-[#FAFAFA] dark:bg-[#141414] text-[#1A1A1A] dark:text-[#F0F0F0] placeholder-zinc-400 select-text outline-none focus:bg-[#EEEEEE]/30 focus:outline-none transition-all placeholder-zinc-450 font-sans border-0"
                  id="folder-name-input"
                  required
                />
              </div>

              {/* Color selectors boxes grid */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  Folder Tag Color
                </label>
                <div className="flex gap-2.5">
                  {FOLDER_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewFolderColor(color)}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        newFolderColor === color
                          ? "scale-110"
                          : "hover:scale-105 border-0"
                      }`}
                      style={{ backgroundColor: color }}
                    >
                      {newFolderColor === color && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setNewFolderName("");
                    setShowFolderModal(false);
                  }}
                  className="flex-1 h-10 bg-[#EEEEEE] dark:bg-[#2D2D2D] hover:opacity-95 text-xs font-semibold rounded-lg text-zinc-700 dark:text-zinc-300 border-0 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newFolderName.trim()}
                  className="flex-1 h-10 bg-[#1A1A1A] dark:bg-[#F0F0F0] hover:opacity-90 disabled:opacity-40 text-white dark:text-[#141414] text-xs font-semibold rounded-lg transition-all border-0 cursor-pointer"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================================================
         CUSTOM SECURE PERMANENT DELETE WARNING POPUP
         ========================================================================== */}
      {noteToDelete && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in select-none font-sans">
          <div className="w-full max-w-sm bg-white dark:bg-[#1E1E1E] rounded-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-105 dark:bg-red-950/40 text-red-650 dark:text-red-400 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-5 h-5 stroke-[1.8]" />
            </div>

            <h3 className="text-md font-semibold text-[#1A1A1A] dark:text-[#F0F0F0]">
              Purge Entry Permanently?
            </h3>

            <p className="text-[12.5px] text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <strong className="text-zinc-850 dark:text-zinc-200">
                "{noteToDelete.title}"
              </strong>
              ?<br />
              This operation is{" "}
              <span className="text-red-650 dark:text-red-405 font-bold">
                permanent
              </span>
              , executes 100% offline, and securely purges the record from
              IndexedDB forever.
            </p>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setNoteToDelete(null)}
                className="flex-1 h-9 rounded-lg bg-[#EEEEEE] dark:bg-[#2D2D2D] text-[12px] font-medium text-zinc-655 dark:text-zinc-300 hover:opacity-95 transition-all border-0 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const targetId = noteToDelete.id;
                  const targetTitle = noteToDelete.title;

                  // Dismiss the dialog early
                  setNoteToDelete(null);
                  setSaveStatus("idle");

                  // If this note is the one currently in the editor workspace, de-select / close first
                  if (activeNote && activeNote.id === targetId) {
                    setActiveNote(null);
                  }

                  // Permanently erase/purge from offline database
                  await deleteSecureNote(targetId, targetTitle);
                }}
                className="flex-1 h-9 rounded-lg bg-[#EF4444] text-white text-[12px] font-semibold transition-all border-0 cursor-pointer"
              >
                Delete Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================================
         DECIPHER SECURE PASSCODE DIALOG MODALS (No Borders, monochrome accents)
         ========================================================================== */}
      {lockNoteToSecure && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/85 flex items-center justify-center p-4 z-50 animate-fade-in select-none font-sans">
          <div className="w-[380px] bg-white dark:bg-[#1E1E1E] rounded-xl p-6 shadow-none flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-[#141414] text-[#1A1A1A] dark:text-white flex items-center justify-center">
                <Lock className="w-5 h-5 stroke-[1.8]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#1A1A1A] dark:text-[#F0F0F0]">
                  Secure with Passphrase Lock
                </h3>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 leading-tight truncate max-w-[240px]">
                  {lockNoteToSecure.title || "Untitled Note"}
                </p>
              </div>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                  Passphrase
                </label>
                <input
                  type="password"
                  placeholder="Enter secure passcode..."
                  value={newLockPassphrase}
                  onChange={(e) => {
                    setNewLockPassphrase(e.target.value);
                    setNewLockError("");
                  }}
                  className="w-full h-9 px-3 text-xs rounded-lg bg-[#FAFAFA] dark:bg-[#141414] text-[#1A1A1A] dark:text-[#F0F0F0] select-text outline-none focus:bg-[#EEEEEE]/30 focus:outline-none transition-all placeholder-zinc-400 font-sans border-0"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-[#c0c0c0] dark:text-zinc-500 uppercase tracking-wider">
                  Confirm Passphrase
                </label>
                <input
                  type="password"
                  placeholder="Confirm secure passcode..."
                  value={newLockPassphraseConfirm}
                  onChange={(e) => {
                    setNewLockPassphraseConfirm(e.target.value);
                    setNewLockError("");
                  }}
                  className="w-full h-9 px-3 text-xs rounded-lg bg-[#FAFAFA] dark:bg-[#141414] text-[#1A1A1A] dark:text-[#F0F0F0] select-text outline-none focus:bg-[#EEEEEE]/30 focus:outline-none transition-all placeholder-zinc-400 font-sans border-0"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                  Passphrase Hint (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Help you remember..."
                  value={newLockHint}
                  onChange={(e) => setNewLockHint(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-lg bg-[#FAFAFA] dark:bg-[#141414] text-[#1A1A1A] dark:text-[#F0F0F0] select-text outline-none focus:bg-[#EEEEEE]/30 focus:outline-none transition-all placeholder-zinc-400 font-sans border-0"
                />
              </div>

              {newLockError && (
                <p className="text-[11px] text-red-655 dark:text-red-405 font-medium leading-snug">
                  {newLockError}
                </p>
              )}
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setLockNoteToSecure(null);
                }}
                className="flex-1 h-9 bg-[#EEEEEE] dark:bg-[#2D2D2D] hover:opacity-95 text-xs font-semibold rounded-lg text-zinc-700 dark:text-zinc-300 border-0 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!newLockPassphrase) {
                    setNewLockError("Passphrase cannot be empty.");
                    return;
                  }
                  if (newLockPassphrase !== newLockPassphraseConfirm) {
                    setNewLockError("Passphrases do not match.");
                    return;
                  }
                  try {
                    const hash = await sha256(newLockPassphrase);
                    await updateSecureNote(lockNoteToSecure.id, {
                      isLocked: true,
                      lockHash: hash,
                      lockHint: newLockHint || null,
                    });
                    setLockNoteToSecure(null);
                    addToast({
                      variant: "success",
                      title: "Note Secured",
                      description: `"${lockNoteToSecure.title || "Note"}" has been secured with a custom passphrase.`,
                    });
                  } catch (err) {
                    console.error(err);
                    setNewLockError("Failed to derive lock key.");
                  }
                }}
                className="flex-1 h-9 bg-[#1A1A1A] dark:bg-[#F0F0F0] hover:opacity-90 text-white dark:text-[#141414] text-xs font-semibold rounded-lg border-0 cursor-pointer"
              >
                Apply Lock
              </button>
            </div>
          </div>
        </div>
      )}

      {lockNoteToUnlock && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/85 flex items-center justify-center p-4 z-50 animate-fade-in select-none font-sans">
          <div className="w-[360px] bg-white dark:bg-[#1E1E1E] rounded-xl p-6 shadow-none flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Lock className="w-5 h-5 stroke-[1.8]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#1A1A1A] dark:text-[#F0F0F0]">
                  Decrypt Locked Note
                </h3>
                <p className="text-[11.5px] text-zinc-400 dark:text-zinc-500 mt-0.5 leading-tight">
                  Please enter note passphrase to grant access.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                  Enter Passphrase
                </label>
                <input
                  type="password"
                  placeholder="Type lock passphrase here..."
                  value={lockPassphraseInput}
                  onChange={(e) => {
                    setLockPassphraseInput(e.target.value);
                    setLockError("");
                  }}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter") {
                      await handleUnlockSubmit();
                    }
                  }}
                  className="w-full h-9 px-3 text-xs rounded-lg bg-[#FAFAFA] dark:bg-[#141414] text-[#1A1A1A] dark:text-[#F0F0F0] select-text outline-none focus:bg-[#EEEEEE]/30 focus:outline-none transition-all placeholder-zinc-400 font-sans border-0"
                  required
                  autoFocus
                />
              </div>

              {lockNoteToUnlock.lockHint && (
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 select-text leading-snug">
                  <strong>Hint:</strong> {lockNoteToUnlock.lockHint}
                </p>
              )}

              {lockError && (
                <p className="text-[11px] text-red-655 dark:text-red-450 font-medium leading-snug select-text">
                  {lockError}
                </p>
              )}
            </div>

            <div className="flex gap-2.5 pt-1.5">
              <button
                type="button"
                onClick={() => {
                  setLockNoteToUnlock(null);
                }}
                className="flex-1 h-9 bg-[#EEEEEE] dark:bg-[#2D2D2D] hover:opacity-95 text-xs font-semibold rounded-lg text-zinc-700 dark:text-zinc-300 border-0 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUnlockSubmit}
                className="flex-1 h-9 bg-[#1A1A1A] dark:bg-[#F0F0F0] hover:opacity-90 text-white dark:text-[#141414] text-xs font-semibold rounded-lg border-0 cursor-pointer"
              >
                Unlock & Open
              </button>
            </div>
          </div>
        </div>
      )}

      {lockNoteToUnlockForRemoval && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/85 flex items-center justify-center p-4 z-50 animate-fade-in select-none font-sans">
          <div className="w-[360px] bg-white dark:bg-[#1E1E1E] rounded-xl p-6 shadow-none flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 flex items-center justify-center">
                <Unlock className="w-5 h-5 stroke-[1.8]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#1A1A1A] dark:text-[#F0F0F0]">
                  Remove Passphrase Lock
                </h3>
                <p className="text-[11.5px] text-zinc-400 dark:text-zinc-500 mt-0.5 leading-tight">
                  Please enter note passphrase to permanently remove security.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                  Confirm Passphrase
                </label>
                <input
                  type="password"
                  placeholder="Type lock passphrase here..."
                  value={removeLockPassphraseInput}
                  onChange={(e) => {
                    setRemoveLockPassphraseInput(e.target.value);
                    setRemoveLockError("");
                  }}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter") {
                      await handleRemoveLockSubmit();
                    }
                  }}
                  className="w-full h-9 px-3 text-xs rounded-lg bg-[#FAFAFA] dark:bg-[#141414] text-[#1A1A1A] dark:text-[#F0F0F0] select-text outline-none focus:bg-[#EEEEEE]/30 focus:outline-none transition-all placeholder-zinc-400 font-sans border-0"
                  required
                  autoFocus
                />
              </div>

              {lockNoteToUnlockForRemoval.lockHint && (
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 select-text leading-snug">
                  <strong>Hint:</strong> {lockNoteToUnlockForRemoval.lockHint}
                </p>
              )}

              {removeLockError && (
                <p className="text-[11px] text-red-655 dark:text-red-450 font-medium leading-snug select-text">
                  {removeLockError}
                </p>
              )}
            </div>

            <div className="flex gap-2.5 pt-1.5">
              <button
                type="button"
                onClick={() => {
                  setLockNoteToUnlockForRemoval(null);
                }}
                className="flex-1 h-9 bg-[#EEEEEE] dark:bg-[#2D2D2D] hover:opacity-95 text-xs font-semibold rounded-lg text-zinc-700 dark:text-zinc-300 border-0 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemoveLockSubmit}
                className="flex-1 h-9 bg-red-650 dark:bg-red-500/20 text-white dark:text-white hover:opacity-90 text-xs font-semibold rounded-lg border-0 cursor-pointer"
              >
                Verify & Remove Lock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================================
         FOLDER RIGHT-CLICK CONTEXT MENU (via createPortal)
         ========================================================================== */}
      {folderMenu.visible &&
        createPortal(
          <>
            {/* Invisible Backdrop to handle dismiss */}
            <div
              className="fixed inset-0 cursor-default"
              style={{ zIndex: 9998 }}
              onClick={closeFolderMenu}
              onContextMenu={(e) => {
                e.preventDefault();
                closeFolderMenu();
              }}
            />

            {/* Menu Card (Zero Borders, Contrast-only layout) */}
            <div
              style={{
                position: "fixed",
                left: folderMenu.x,
                top: folderMenu.y,
                zIndex: 9999,
                minWidth: "180px",
              }}
              className="bg-[#242424] rounded-xl py-1.5 overflow-hidden select-none"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Folder Header */}
              <div className="px-3.5 py-2 mb-1">
                <p className="text-[12px] font-semibold text-[#F0F0F0] truncate">
                  {folderMenu.folder?.name}
                </p>
              </div>

              <div className="mx-3.5 h-px bg-[#333333] mb-1" />

              {/* Action Buttons */}
              <button
                type="button"
                onClick={() => {
                  setEditingFolderId(folderMenu.folder.id);
                  closeFolderMenu();
                }}
                className="w-full h-8 flex items-center gap-2.5 px-3.5 text-[13px] text-left cursor-pointer text-[#C0C0C0] hover:text-[#F0F0F0] hover:bg-[#2E2E2E] transition-colors font-sans border-0 outline-none"
              >
                <Pencil className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Rename</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setColorPickerFolder(folderMenu.folder);
                  closeFolderMenu();
                }}
                className="w-full h-8 flex items-center gap-2.5 px-3.5 text-[13px] text-left cursor-pointer text-[#C0C0C0] hover:text-[#F0F0F0] hover:bg-[#2E2E2E] transition-colors font-sans border-0 outline-none"
              >
                <Palette className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Change Color</span>
              </button>

              <div className="mx-3.5 h-px bg-[#333333] my-1" />

              <button
                type="button"
                disabled={folderMenu.folder?.isDefault}
                onClick={() => {
                  handleDeleteFolder(folderMenu.folder.id);
                  closeFolderMenu();
                }}
                className="w-full h-8 flex items-center gap-2.5 px-3.5 text-[13px] text-left cursor-pointer text-red-400 hover:text-red-300 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-sans border-0 outline-none font-medium"
              >
                <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Delete Folder</span>
              </button>
            </div>
          </>,
          document.body,
        )}

      {/* ==========================================================================
         FOLDER COLOR PICKER POPUP (via createPortal)
         ========================================================================== */}
      {colorPickerFolder &&
        createPortal(
          <>
            {/* Invisible Backdrop to dismiss */}
            <div
              className="fixed inset-0 cursor-default"
              style={{ zIndex: 9998 }}
              onClick={() => setColorPickerFolder(null)}
            />

            {/* Color Selector Box (Zero Borders / Rings / Box Shadows) */}
            <div
              style={{
                position: "fixed",
                left: 260,
                top: "40%",
                zIndex: 9999,
                width: "180px",
              }}
              className="bg-[#242424] rounded-xl p-3.5 select-none"
            >
              <p className="text-[10px] font-semibold text-[#888888] uppercase tracking-[0.06em] mb-2 px-0.5 leading-none">
                Folder tag color
              </p>

              {/* 5x2 Color Palette Grid */}
              <div className="grid grid-cols-5 gap-2">
                {[
                  { hex: "#888888", label: "Gray" },
                  { hex: "#F0F0F0", label: "White" },
                  { hex: "#EF4444", label: "Red" },
                  { hex: "#F97316", label: "Orange" },
                  { hex: "#EAB308", label: "Yellow" },
                  { hex: "#22C55E", label: "Green" },
                  { hex: "#3B82F6", label: "Blue" },
                  { hex: "#8B5CF6", label: "Purple" },
                  { hex: "#EC4899", label: "Pink" },
                  { hex: "#14B8A6", label: "Teal" },
                ].map(({ hex, label }) => (
                  <button
                    key={hex}
                    type="button"
                    title={label}
                    onClick={() => handleChangeColor(colorPickerFolder.id, hex)}
                    className={`
                    w-7 h-7 rounded-full cursor-pointer
                    transition-transform duration-150
                    hover:scale-110 active:scale-95
                    flex items-center justify-center border-0 outline-none
                    ${colorPickerFolder.color === hex ? "scale-105 opacity-100" : "opacity-80 hover:opacity-100"}
                  `}
                    style={{ backgroundColor: hex }}
                  >
                    {colorPickerFolder.color === hex && (
                      <svg width="10" height="10" viewBox="0 0 10 10">
                        <path
                          d="M2 5l2.5 2.5L8 3"
                          stroke={hex === "#F0F0F0" ? "#1A1A1A" : "#FFFFFF"}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          fill="none"
                        />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}

// ==========================================================================
// SUB-COMPONENT: FolderItem
// Centered layout block mapping for list folders, drag handling, double-click edits
// ==========================================================================
function FolderItem({
  folder,
  isActive,
  isDragged,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onContextMenu,
  onClick,
  editingFolderId,
  onRename,
  onRenameCancel,
  isManageFolders,
  isSelected,
  onToggleSelect,
}) {
  return (
    <div
      draggable={!isManageFolders}
      onDragStart={(e) => onDragStart(e, folder)}
      onDragOver={(e) => onDragOver(e, folder)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, folder)}
      onDragEnd={onDragEnd}
      onContextMenu={(e) => !isManageFolders && onContextMenu(e, folder)}
      onClick={() => {
        if (isManageFolders) {
          onToggleSelect(folder.id);
        } else {
          onClick(folder);
        }
      }}
      className={`
        group relative flex items-center gap-2
        px-3 h-9 rounded-lg
        cursor-pointer select-none
        transition-all duration-150
        ${isDragged ? "opacity-40" : ""}
        ${
          isDragOver
            ? "bg-zinc-200/70 dark:bg-[#2A2A2A]/70 shadow-none"
            : isActive && !isManageFolders
              ? "bg-white dark:bg-[#252525] text-[#1A1A1A] dark:text-[#F0F0F0]"
              : "text-[#6B6B6B] dark:text-[#888888] hover:bg-[#EEEEEE] dark:hover:bg-[#252525]/50"
        }
      `}
    >
      {/* Drop overlay top hint indicator line */}
      {isDragOver && !isDragged && !isManageFolders && (
        <div className="absolute top-0 left-2 right-2 h-0.5 rounded-full bg-zinc-400/50 dark:bg-[#F0F0F0]/20 pointer-events-none" />
      )}

      {/* Custom Left controls */}
      {isManageFolders ? (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(folder.id)}
          onClick={(e) => e.stopPropagation()}
          className="w-3.5 h-3.5 text-[#1A1A1A] dark:text-[#F0F0F0] rounded cursor-pointer accent-[#1A1A1A] dark:accent-[#F0F0F0] flex-shrink-0"
        />
      ) : (
        /* HTML5 Drag Handle (only visible on hover icon) */
        <div
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-grab active:cursor-grabbing flex-shrink-0 -ml-1"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3.5 h-3.5 text-zinc-400 dark:text-[#444444]" />
        </div>
      )}

      {/* Folder tag visual open icon */}
      <FolderOpen
        className="w-3.5 h-3.5 flex-shrink-0 transition-colors duration-150"
        style={{ color: getFolderColor(folder.color) }}
      />

      {/* Edit input block / Name label mapping */}
      {editingFolderId === folder.id ? (
        <input
          autoFocus
          defaultValue={folder.name}
          className="flex-1 min-w-0 bg-transparent outline-none text-[13px] text-zinc-800 dark:text-[#F0F0F0] p-0 border-0 outline-none focus:ring-0"
          onBlur={(e) => onRename(folder.id, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
            if (e.key === "Escape") {
              onRenameCancel();
            }
          }}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          className="flex-1 min-w-0 text-[13px] truncate font-medium"
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (!isManageFolders) {
              onContextMenu(e, folder, "rename");
            }
          }}
        >
          {folder.name}
        </span>
      )}

      {/* Note counting bubble indicator */}
      <span className="text-[11px] font-mono text-zinc-400 dark:text-[#555555] flex-shrink-0 font-medium">
        {folder.itemCount || 0}
      </span>
    </div>
  );
}

export default Notes;
