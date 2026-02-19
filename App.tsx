
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Task, TaskStatus, Priority } from './types';
import TaskCard from './components/TaskCard';
import AddTaskModal from './components/AddTaskModal';
import { suggestPriorities } from './services/geminiService';

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('scholarflow_tasks');
    return saved ? JSON.parse(saved) : [];
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [filter, setFilter] = useState<TaskStatus | 'All'>('All');
  
  // Timer effect to update seconds for all running tasks
  useEffect(() => {
    const interval = setInterval(() => {
      setTasks(prevTasks => {
        const hasRunningTasks = prevTasks.some(t => t.isTimerRunning);
        if (!hasRunningTasks) return prevTasks;

        return prevTasks.map(task => {
          if (task.isTimerRunning && task.status !== TaskStatus.COMPLETED) {
            return { ...task, timeSpentSeconds: task.timeSpentSeconds + 1 };
          }
          return task;
        });
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem('scholarflow_tasks', JSON.stringify(tasks));
  }, [tasks]);

  const addTask = (newTask: Task) => {
    setTasks(prev => [newTask, ...prev]);
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const toggleStatus = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const isNowCompleted = t.status !== TaskStatus.COMPLETED;
        return {
          ...t,
          status: isNowCompleted ? TaskStatus.COMPLETED : TaskStatus.TODO,
          isTimerRunning: isNowCompleted ? false : t.isTimerRunning
        };
      }
      return t;
    }));
  };

  const toggleTimer = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, isTimerRunning: !t.isTimerRunning };
      }
      // Optional: Stop other timers if you want focus mode
      // return { ...t, isTimerRunning: t.id === id ? !t.isTimerRunning : false };
      return t;
    }));
  };

  const resetTimer = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, timeSpentSeconds: 0, isTimerRunning: false };
      }
      return t;
    }));
  };

  const handleAiPrioritize = async () => {
    if (tasks.length === 0) return;
    
    setIsAiProcessing(true);
    const activeTasks = tasks.filter(t => t.status !== TaskStatus.COMPLETED);
    
    try {
      const suggestions = await suggestPriorities(activeTasks);
      
      setTasks(prev => prev.map(task => {
        const suggestion = suggestions.find(s => s.taskId === task.id);
        if (suggestion) {
          return {
            ...task,
            priority: suggestion.suggestedPriority,
            aiReasoning: suggestion.reasoning
          };
        }
        return task;
      }));
    } finally {
      setIsAiProcessing(false);
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (filter === 'All') return true;
    return t.status === filter;
  }).sort((a, b) => {
    if (a.status === TaskStatus.COMPLETED && b.status !== TaskStatus.COMPLETED) return 1;
    if (a.status !== TaskStatus.COMPLETED && b.status === TaskStatus.COMPLETED) return -1;
    
    const priorityOrder = { [Priority.HIGH]: 0, [Priority.MEDIUM]: 1, [Priority.LOW]: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const completionRate = tasks.length > 0 
    ? Math.round((tasks.filter(t => t.status === TaskStatus.COMPLETED).length / tasks.length) * 100) 
    : 0;

  const totalTimeSpentSeconds = tasks.reduce((acc, t) => acc + t.timeSpentSeconds, 0);
  const formatTotalTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  return (
    <div className="min-h-screen pb-20 lg:pb-12">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <i className="fas fa-graduation-cap text-white text-lg"></i>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">ScholarFlow</h1>
              <p className="text-xs text-slate-500 font-medium">Smart Academic Manager</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-6">
             <div className="flex flex-col items-end mr-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Study Time</span>
                <span className="text-sm font-bold text-indigo-600">{formatTotalTime(totalTimeSpentSeconds)}</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${completionRate}%` }}></div>
                </div>
                <span className="text-xs font-bold text-slate-600">{completionRate}%</span>
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-10">
          <h2 className="text-3xl font-extrabold text-slate-900 mb-2">My Tasks</h2>
          <p className="text-slate-500 font-medium">Manage assignments and track your study sessions.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
          <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            {['All', TaskStatus.TODO, TaskStatus.COMPLETED].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`flex-1 sm:flex-none px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                  filter === f ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto sm:ml-auto">
            <button 
              onClick={handleAiPrioritize}
              disabled={isAiProcessing || tasks.length === 0}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-sm transition-all border border-indigo-200 ${
                isAiProcessing 
                  ? 'bg-indigo-50 text-indigo-400 cursor-not-allowed' 
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              {isAiProcessing ? (
                <i className="fas fa-circle-notch animate-spin"></i>
              ) : (
                <i className="fas fa-magic"></i>
              )}
              {isAiProcessing ? 'Analyzing...' : 'AI Prioritize'}
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 py-3 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm shadow-xl shadow-slate-200 transition-all"
            >
              <i className="fas fa-plus"></i>
              Add Task
            </button>
          </div>
        </div>

        {filteredTasks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTasks.map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
                onDelete={deleteTask}
                onStatusToggle={toggleStatus}
                onTimerToggle={toggleTimer}
                onTimerReset={resetTimer}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-clipboard-list text-slate-300 text-2xl"></i>
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">No tasks found</h3>
            <p className="text-slate-400 max-w-xs mx-auto text-sm">
              {filter === 'All' 
                ? "You haven't added any assignments yet."
                : `You don't have any tasks marked as '${filter}'.`}
            </p>
          </div>
        )}
      </main>

      <button 
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-8 right-8 md:hidden w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center text-xl z-30"
      >
        <i className="fas fa-plus"></i>
      </button>

      <AddTaskModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onAdd={addTask} 
      />

      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 md:hidden z-20">
        <div className="flex justify-around items-center">
          <div className="flex flex-col items-center">
            <span className="text-sm font-bold text-indigo-600">{formatTotalTime(totalTimeSpentSeconds)}</span>
            <span className="text-[10px] uppercase font-bold text-slate-400">Tracked</span>
          </div>
          <div className="w-px h-8 bg-slate-100"></div>
          <div className="flex flex-col items-center">
            <span className="text-lg font-bold text-green-600">{tasks.filter(t => t.status === TaskStatus.COMPLETED).length}</span>
            <span className="text-[10px] uppercase font-bold text-slate-400">Done</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
