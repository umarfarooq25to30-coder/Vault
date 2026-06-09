import { useState } from 'react'
import {
  FileIcon, FileText, Image, Film,
  X, Download, Tag as TagIcon,
  HardDrive, Calendar, Edit2
} from 'lucide-react'
import { 
  formatFileSize, getFileCategory, getExtension
} from '../../utils/fileUtils'

export default function FileDetailsPanel({
  files, selectedIds,
  onClose, onDownload
}) {
  if (selectedIds.size !== 1) return null;
  
  const selectedId = Array.from(selectedIds)[0];
  const file = files.find(f => f.id === selectedId);
  
  if (!file) return null;

  const type = getFileCategory(file.title);
  const ext = getExtension(file.title).toUpperCase();
  
  let Icon = FileIcon;
  if (type === 'image') Icon = Image;
  if (type === 'video') Icon = Film;
  if (type === 'document') Icon = FileText;
  
  const [description, setDescription] = useState(file.data?.description || '')

  return (
    <div className="w-80 flex-shrink-0 flex flex-col border-l border-[#1E1E1E] overflow-y-auto bg-[#181818]">
      <div className="flex items-center justify-between p-4 border-b border-[#1E1E1E]">
        <h2 className="text-[14px] font-semibold text-[#F0F0F0]">File Details</h2>
        <button onClick={onClose} className="text-[#888] hover:text-[#F0F0F0] p-1 rounded-md hover:bg-[#252525]">
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="p-6 flex flex-col items-center border-b border-[#1E1E1E]">
        <div className="w-16 h-16 rounded-2xl bg-[#252525] flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-[#888888]" />
        </div>
        <h3 className="text-[14px] font-medium text-[#F0F0F0] text-center w-full truncate mb-1">
          {file.title}
        </h3>
        <p className="text-[12px] text-[#555555]">
          {ext} File
        </p>
      </div>

      <div className="p-4 flex flex-col gap-4">
        <div>
          <p className="text-[11px] font-medium text-[#555] uppercase tracking-wider mb-2">Information</p>
          <div className="flex justify-between items-center py-1">
            <span className="text-[12px] text-[#888] flex items-center gap-1.5"><HardDrive className="w-3.5 h-3.5"/> Size</span>
            <span className="text-[12px] text-[#F0F0F0]">{formatFileSize(file.data?.size)}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-[12px] text-[#888] flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> Uploaded</span>
            <span className="text-[12px] text-[#F0F0F0]">
              {new Date(file.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div>
           <p className="text-[11px] font-medium text-[#555] uppercase tracking-wider mb-2">Description</p>
           <textarea
             className="w-full h-24 rounded-xl p-3 text-[12px] text-[#F0F0F0] outline-none resize-none bg-[#141414] border border-[#252525] focus:border-[#444]"
             placeholder="Add a description..."
             value={description}
             onChange={e => setDescription(e.target.value)}
           />
        </div>

        <button 
          onClick={() => onDownload(file)}
          className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[13px] font-medium text-[#141414] bg-[#F0F0F0] transition-colors hover:bg-white">
          <Download className="w-4 h-4" />
          Download File
        </button>
      </div>
    </div>
  )
}
