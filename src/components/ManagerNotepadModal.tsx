import React, { useState, useEffect, useCallback } from 'react';
import { 
  CheckSquare, 
  FileText, 
  Bookmark, 
  X, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Copy, 
  Check, 
  AlertCircle, 
  Clock, 
  Search,
  Sparkles,
  Download,
  Printer
} from 'lucide-react';
import { NotepadTask, NotepadSnippet, ManagerNotepadData, TaskPriority } from '../types/managerNotepad';
import { syncShopSettings, subscribeToShopSettings } from '../lib/firestoreSync';

const STORAGE_KEY_NOTEPAD = 'dealership_service_manager_notepad_v1';

interface ManagerNotepadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManagerNotepadModal: React.FC<ManagerNotepadModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'CHECKLIST' | 'SCRATCHPAD' | 'SNIPPETS'>('CHECKLIST');

  // Notepad State
  const [notepadData, setNotepadData] = useState<ManagerNotepadData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_NOTEPAD);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
            scratchpad: typeof parsed.scratchpad === 'string' ? parsed.scratchpad : '',
            snippets: Array.isArray(parsed.snippets) ? parsed.snippets : [],
            updatedAt: parsed.updatedAt || new Date().toISOString()
          };
        }
      }
    } catch {
      // ignore
    }
    return {
      tasks: [
        {
          id: 'task_demo_1',
          title: 'Review backordered parts ETAs with service advisors',
          completed: false,
          priority: 'HIGH',
          createdAt: new Date().toISOString()
        },
        {
          id: 'task_demo_2',
          title: 'Confirm warranty authorization codes on open claims',
          completed: false,
          priority: 'NORMAL',
          createdAt: new Date().toISOString()
        }
      ],
      scratchpad: '',
      snippets: [
        {
          id: 'snip_demo_1',
          title: 'NAPA Parts Direct Dispatch',
          content: 'Rep: Mark Stevens | Direct: 555-019-4821 | Delivery Cutoff: 2:30 PM',
          category: 'SUPPLIER',
          createdAt: new Date().toISOString()
        },
        {
          id: 'snip_demo_2',
          title: 'Warranty Pre-Auth Thresholds',
          content: 'Under $500: Self-approve | $500-$1500: Regional rep call | Over $1500: Photos & teardown log required',
          category: 'WARRANTY',
          createdAt: new Date().toISOString()
        }
      ],
      updatedAt: new Date().toISOString()
    };
  });

  // Checklist New Item Inputs
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('NORMAL');
  const [taskFilter, setTaskFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');

  // Snippet New Item Inputs
  const [newSnipTitle, setNewSnipTitle] = useState('');
  const [newSnipContent, setNewSnipContent] = useState('');
  const [newSnipCategory, setNewSnipCategory] = useState<NotepadSnippet['category']>('GENERAL');
  const [snipSearch, setSnipSearch] = useState('');

  // UI Toast / Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Save notepad data locally and sync to cloud
  const saveNotepadData = useCallback((updated: ManagerNotepadData) => {
    setNotepadData(updated);
    try {
      localStorage.setItem(STORAGE_KEY_NOTEPAD, JSON.stringify(updated));
    } catch {
      // ignore
    }
    syncShopSettings({ managerNotepadData: updated });
  }, []);

  // Subscribe to real-time shop settings cloud changes
  useEffect(() => {
    const unsubscribe = subscribeToShopSettings((settings) => {
      if (settings?.managerNotepadData && typeof settings.managerNotepadData === 'object') {
        const cloudData = settings.managerNotepadData as ManagerNotepadData;
        setNotepadData(cloudData);
        try {
          localStorage.setItem(STORAGE_KEY_NOTEPAD, JSON.stringify(cloudData));
        } catch {
          // ignore
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Copy to clipboard helper
  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    triggerToast('Copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Add Task
  const handleAddTask = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: NotepadTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: newTaskTitle.trim(),
      completed: false,
      priority: newTaskPriority,
      createdAt: new Date().toISOString()
    };

    const updated: ManagerNotepadData = {
      ...notepadData,
      tasks: [newTask, ...notepadData.tasks],
      updatedAt: new Date().toISOString()
    };

    saveNotepadData(updated);
    setNewTaskTitle('');
    triggerToast('Task added');
  };

  // Toggle Task Completed
  const handleToggleTask = (taskId: string) => {
    const updatedTasks = notepadData.tasks.map(t => {
      if (t.id !== taskId) return t;
      return { ...t, completed: !t.completed };
    });

    saveNotepadData({
      ...notepadData,
      tasks: updatedTasks,
      updatedAt: new Date().toISOString()
    });
  };

  // Delete Task
  const handleDeleteTask = (taskId: string) => {
    const updatedTasks = notepadData.tasks.filter(t => t.id !== taskId);
    saveNotepadData({
      ...notepadData,
      tasks: updatedTasks,
      updatedAt: new Date().toISOString()
    });
  };

  // Clear Completed Tasks
  const handleClearCompletedTasks = () => {
    const activeTasks = notepadData.tasks.filter(t => !t.completed);
    saveNotepadData({
      ...notepadData,
      tasks: activeTasks,
      updatedAt: new Date().toISOString()
    });
    triggerToast('Cleared completed tasks');
  };

  // Update Scratchpad
  const handleUpdateScratchpad = (text: string) => {
    const updated: ManagerNotepadData = {
      ...notepadData,
      scratchpad: text,
      updatedAt: new Date().toISOString()
    };
    saveNotepadData(updated);
  };

  // Add Snippet
  const handleAddSnippet = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newSnipTitle.trim() || !newSnipContent.trim()) return;

    const newSnippet: NotepadSnippet = {
      id: `snip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: newSnipTitle.trim(),
      content: newSnipContent.trim(),
      category: newSnipCategory,
      createdAt: new Date().toISOString()
    };

    const updated: ManagerNotepadData = {
      ...notepadData,
      snippets: [newSnippet, ...notepadData.snippets],
      updatedAt: new Date().toISOString()
    };

    saveNotepadData(updated);
    setNewSnipTitle('');
    setNewSnipContent('');
    triggerToast('Quick Reference snippet saved');
  };

  // Delete Snippet
  const handleDeleteSnippet = (snipId: string) => {
    const updatedSnippets = notepadData.snippets.filter(s => s.id !== snipId);
    saveNotepadData({
      ...notepadData,
      snippets: updatedSnippets,
      updatedAt: new Date().toISOString()
    });
    triggerToast('Removed snippet');
  };

  // Filtered Tasks
  const filteredTasks = notepadData.tasks.filter(t => {
    if (taskFilter === 'ACTIVE') return !t.completed;
    if (taskFilter === 'COMPLETED') return t.completed;
    return true;
  });

  const activeTaskCount = notepadData.tasks.filter(t => !t.completed).length;

  // Filtered Snippets
  const filteredSnippets = notepadData.snippets.filter(s => {
    if (!snipSearch.trim()) return true;
    const q = snipSearch.trim().toLowerCase();
    return s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q) || (s.category && s.category.toLowerCase().includes(q));
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-xs">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Service Manager Notepad & Scratchpad
                </h2>
                {activeTaskCount > 0 && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500 text-white font-mono">
                    {activeTaskCount} Pending Task{activeTaskCount === 1 ? '' : 's'}
                  </span>
                )}
                {toastMessage && (
                  <span className="text-xs text-emerald-300 font-bold bg-emerald-950 px-2.5 py-0.5 rounded border border-emerald-600/50 animate-in fade-in">
                    {toastMessage}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Personal daily checklist, scratchpad, and quick reference snippet manager. Auto-saves live to cloud.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 px-4 pt-3 border-b border-slate-200 flex items-center justify-between shrink-0 overflow-x-auto gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('CHECKLIST')}
              className={`px-4 py-2 rounded-t-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'CHECKLIST'
                  ? 'bg-white text-purple-900 border-t-2 border-purple-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <CheckSquare className="w-4 h-4 text-purple-600" />
              <span>To-Do Checklist</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-800">
                {notepadData.tasks.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SCRATCHPAD')}
              className={`px-4 py-2 rounded-t-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'SCRATCHPAD'
                  ? 'bg-white text-purple-900 border-t-2 border-purple-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <FileText className="w-4 h-4 text-purple-600" />
              <span>Quick Scratchpad</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SNIPPETS')}
              className={`px-4 py-2 rounded-t-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'SNIPPETS'
                  ? 'bg-white text-purple-900 border-t-2 border-purple-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Bookmark className="w-4 h-4 text-purple-600" />
              <span>Reference Snippets</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-800">
                {notepadData.snippets.length}
              </span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50">
          
          {/* TAB 1: TO-DO CHECKLIST */}
          {activeTab === 'CHECKLIST' && (
            <div className="space-y-4 max-w-3xl mx-auto">
              
              {/* Add Task Form */}
              <form onSubmit={handleAddTask} className="bg-white p-4 rounded-xl border border-slate-300 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    placeholder="Enter a new task or reminder..."
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                  
                  <select
                    value={newTaskPriority}
                    onChange={e => setNewTaskPriority(e.target.value as TaskPriority)}
                    className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-none cursor-pointer"
                  >
                    <option value="HIGH">🔥 High Priority</option>
                    <option value="NORMAL">⚡ Normal</option>
                    <option value="LOW">💤 Low Priority</option>
                  </select>

                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Task</span>
                  </button>
                </div>
              </form>

              {/* Task Controls & Filter Pills */}
              <div className="flex items-center justify-between gap-3 flex-wrap bg-white p-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-[10px] font-black uppercase text-slate-400 mr-1">Filter:</span>
                  <button
                    type="button"
                    onClick={() => setTaskFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                      taskFilter === 'ALL' ? 'bg-purple-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    All ({notepadData.tasks.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskFilter('ACTIVE')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                      taskFilter === 'ACTIVE' ? 'bg-purple-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    Active ({activeTaskCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskFilter('COMPLETED')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                      taskFilter === 'COMPLETED' ? 'bg-purple-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    Completed ({notepadData.tasks.length - activeTaskCount})
                  </button>
                </div>

                {notepadData.tasks.some(t => t.completed) && (
                  <button
                    type="button"
                    onClick={handleClearCompletedTasks}
                    className="text-xs font-bold text-rose-600 hover:text-rose-800 transition-colors cursor-pointer"
                  >
                    Clear Completed
                  </button>
                )}
              </div>

              {/* Task List */}
              <div className="space-y-2">
                {filteredTasks.length === 0 ? (
                  <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
                    <CheckSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700 text-sm">No tasks in this list</p>
                    <p className="text-xs text-slate-400 mt-0.5">Add a task above to keep track of your daily action items.</p>
                  </div>
                ) : (
                  filteredTasks.map(task => (
                    <div
                      key={task.id}
                      className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        task.completed 
                          ? 'bg-slate-100 border-slate-200 text-slate-400 line-through' 
                          : 'bg-white border-slate-300 shadow-2xs hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => handleToggleTask(task.id)}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                            task.completed 
                              ? 'bg-emerald-600 border-emerald-600 text-white' 
                              : 'border-slate-400 hover:border-purple-600 bg-white'
                          }`}
                        >
                          {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>

                        <span className={`text-xs font-bold min-w-0 break-words ${task.completed ? 'text-slate-400' : 'text-slate-900'}`}>
                          {task.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {task.priority === 'HIGH' && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-300 uppercase">
                            High Priority
                          </span>
                        )}
                        {task.priority === 'LOW' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-300 uppercase">
                            Low
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                          title="Delete task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

          {/* TAB 2: QUICK SCRATCHPAD */}
          {activeTab === 'SCRATCHPAD' && (
            <div className="space-y-3 max-w-3xl mx-auto">
              
              <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span>Freeform Auto-Saving Notes Area</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyText(notepadData.scratchpad, 'scratchpad')}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-900 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 border border-slate-300"
                  >
                    {copiedId === 'scratchpad' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy All</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Clear scratchpad content?')) {
                        handleUpdateScratchpad('');
                        triggerToast('Cleared scratchpad');
                      }
                    }}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-rose-200"
                  >
                    Clear Text
                  </button>
                </div>
              </div>

              <textarea
                value={notepadData.scratchpad}
                onChange={e => handleUpdateScratchpad(e.target.value)}
                placeholder="Type your notes, VIN drops, vendor phone numbers, customer messages, or scratch notes here..."
                rows={14}
                className="w-full p-4 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 leading-relaxed focus:ring-2 focus:ring-purple-500 focus:outline-none shadow-inner"
              />

              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Auto-saves as you type</span>
                <span>
                  {notepadData.scratchpad.length} Characters | {notepadData.scratchpad.trim() ? notepadData.scratchpad.trim().split(/\s+/).length : 0} Words
                </span>
              </div>

            </div>
          )}

          {/* TAB 3: REFERENCE SNIPPETS */}
          {activeTab === 'SNIPPETS' && (
            <div className="space-y-4 max-w-3xl mx-auto">
              
              {/* Add Snippet Form */}
              <form onSubmit={handleAddSnippet} className="bg-white p-4 rounded-xl border border-slate-300 shadow-2xs space-y-3">
                <h4 className="text-xs font-black uppercase text-purple-950 flex items-center gap-1.5">
                  <Bookmark className="w-4 h-4 text-purple-700" />
                  <span>Add Quick Reference Snippet</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Snippet Title (e.g. NAPA Direct Phone / Warranty Cutoff)"
                      value={newSnipTitle}
                      onChange={e => setNewSnipTitle(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <select
                      value={newSnipCategory}
                      onChange={e => setNewSnipCategory(e.target.value as any)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-none cursor-pointer"
                    >
                      <option value="GENERAL">General</option>
                      <option value="SUPPLIER">Supplier / Vendor</option>
                      <option value="WARRANTY">Warranty</option>
                      <option value="PROCEDURE">Procedure</option>
                      <option value="PHONE">Phone Extension</option>
                    </select>
                  </div>
                </div>

                <div>
                  <textarea
                    placeholder="Content details (e.g. Account number, contact person, cut-off hours, authorization policy...)"
                    value={newSnipContent}
                    onChange={e => setNewSnipContent(e.target.value)}
                    rows={2}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Save Snippet</span>
                  </button>
                </div>
              </form>

              {/* Search Snippets */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search reference snippets..."
                  value={snipSearch}
                  onChange={e => setSnipSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              {/* Snippet Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredSnippets.length === 0 ? (
                  <div className="col-span-full bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
                    <Bookmark className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700 text-sm">No reference snippets found</p>
                    <p className="text-xs text-slate-400 mt-0.5">Add supplier contacts or procedures above for 1-click access.</p>
                  </div>
                ) : (
                  filteredSnippets.map(snip => (
                    <div
                      key={snip.id}
                      className="bg-white p-4 rounded-xl border border-slate-300 shadow-2xs hover:border-purple-300 transition-all flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-black text-slate-900 text-xs tracking-tight">
                            {snip.title}
                          </h4>
                          {snip.category && (
                            <span className="text-[9px] font-black px-2 py-0.5 rounded bg-purple-100 text-purple-900 uppercase shrink-0">
                              {snip.category}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-700 mt-2 font-mono whitespace-pre-wrap leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                          {snip.content}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleCopyText(snip.content, snip.id)}
                          className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
                        >
                          {copiedId === snip.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Content</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteSnippet(snip.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                          title="Delete snippet"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
};
