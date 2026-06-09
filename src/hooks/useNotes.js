// Custom hook managing the secure creation, decryption, updating, deletion, and sorting of local encrypted notes.

import { useState, useEffect, useCallback } from 'react';
import { useVaultStore } from '../store/vaultStore';
import { useToastStore } from '../store/toastStore';
import { 
  createItem, 
  getItem, 
  getAllItems, 
  updateItem, 
  deleteItem, 
  toggleFavorite,
  getFolders,
  createFolder,
  deleteFolder,
  updateFolder
} from '../db/vaultOperations';

export function useNotes() {
  const derivedKey = useVaultStore((state) => state.derivedKey);
  const addToast = useToastStore((state) => state.addToast);

  const [notes, setNotes] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeNote, setActiveNote] = useState(null);

  // Load all folder and notes lists securely
  const loadNotesData = useCallback(async () => {
    if (!derivedKey) return;
    setLoading(true);
    try {
      // Fetch note headers
      const notesResult = await getAllItems(derivedKey, { type: 'note' });
      setNotes(notesResult.items);

      // Fetch folders
      const foldersList = await getFolders();
      setFolders(foldersList);
    } catch (err) {
      console.error('Failed to load storage notes:', err);
      addToast({
        variant: 'danger',
        title: 'Decryption Error',
        description: 'Failed to safely load or decrypt notes from device storage.',
      });
    } finally {
      setLoading(false);
    }
  }, [derivedKey, addToast]);

  // Load actual decrypted notes details
  const getDecryptedNote = useCallback(async (id) => {
    if (!derivedKey || !id) return null;
    try {
      const fullNote = await getItem(id, derivedKey);
      return fullNote;
    } catch (err) {
      console.error('Failed to decrypt specific note:', id, err);
      addToast({
        variant: 'danger',
        title: 'Error Decrypting Content',
        description: 'Failed to decrypt secure note content with active cryptographic key.',
      });
      return null;
    }
  }, [derivedKey, addToast]);

  // Securely add a new note
  const addSecureNote = async (title = 'Untitled Note', data = '', folderId = null, tags = []) => {
    if (!derivedKey) return null;
    try {
      const freshItem = await createItem({
        type: 'note',
        title,
        data,
        folderId: folderId ? Number(folderId) : null,
        tags,
        isFavorite: false,
      }, derivedKey);

      await loadNotesData();
      addToast({
        variant: 'success',
        title: 'Note Created',
        description: `"${title}" has been saved securely with AES-256-GCM.`,
      });
      return freshItem;
    } catch (err) {
      console.error('Failed to add secure note:', err);
      addToast({
        variant: 'danger',
        title: 'Creation Failed',
        description: 'An error occurred while encrypting or saving your secure note.',
      });
      return null;
    }
  };

  // Update secure note details
  const updateSecureNote = async (id, updates) => {
    if (!derivedKey || !id) return null;
    try {
      const updatedItem = await updateItem(id, updates, derivedKey);
      await loadNotesData();
      
      // Keep activeNote synchronized with updates
      setActiveNote(prev => {
        if (prev && prev.id === id) {
          return { ...prev, ...updates };
        }
        return prev;
      });

      return updatedItem;
    } catch (err) {
      console.error('Failed to update secure note:', id, err);
      addToast({
        variant: 'danger',
        title: 'Save Failed',
        description: 'Failed to encrypt or update secure note content.',
      });
      return null;
    }
  };

  // Permanently delete secure note
  const deleteSecureNote = async (id, title) => {
    if (!id) return false;
    try {
      await deleteItem(id);
      if (activeNote && activeNote.id === id) {
        setActiveNote(null);
      }
      await loadNotesData();
      addToast({
        variant: 'success',
        title: 'Note Deleted',
        description: `"${title || 'Note'}" has been securely purged from this device.`,
      });
      return true;
    } catch (err) {
      console.error('Failed to delete secure note:', id, err);
      addToast({
        variant: 'danger',
        title: 'Deletion Failed',
        description: 'Failed to delete note from local database.',
      });
      return false;
    }
  };

  // Toggle favorite status on target note
  const toggleSecureFavorite = async (id) => {
    if (!id) return;
    try {
      await toggleFavorite(id);
      await loadNotesData();
      if (activeNote && activeNote.id === id) {
        setActiveNote(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
      }
    } catch (err) {
      console.error('Failed to toggle favorite status:', id, err);
    }
  };

  // Create folder categorization
  const addFolder = async (name, color = '#888888') => {
    try {
      const id = await createFolder(name, null, color);
      await loadNotesData();
      return id;
    } catch (err) {
      console.warn('Failed to insert notes folder:', err);
      return null;
    }
  };

  // Securely update a folder (e.g., location parentId, name, or color)
  const updateSecureFolder = async (folderId, updates) => {
    try {
      await updateFolder(folderId, updates);
      await loadNotesData();
      return true;
    } catch (err) {
      console.error('Failed to update folder:', folderId, err);
      return false;
    }
  };

  // Safe delete folder
  const deleteSecureFolder = async (folderId) => {
    try {
      await deleteFolder(folderId);
      await loadNotesData();
      addToast({
        variant: 'success',
        title: 'Folder Deleted',
        description: 'The secure folder was deleted, and its contents relocated.',
      });
      return true;
    } catch (err) {
      console.error('Failed to delete folder:', folderId, err);
      return false;
    }
  };

  // Reload notes automatically when master password state changes
  useEffect(() => {
    if (derivedKey) {
      loadNotesData();
    }
  }, [derivedKey, loadNotesData]);

  return {
    notes,
    folders,
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
  };
}

export default useNotes;
