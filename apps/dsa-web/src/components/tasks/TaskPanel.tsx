import type React from 'react';
import { ListTodo } from 'lucide-react';
import type { TaskInfo } from '../../types/analysis';

interface TaskItemProps {
  task: TaskInfo;
}

const TaskItem: React.FC<TaskItemProps> = ({ task }) => {
  const isPending = task.status === 'pending';
  const isProcessing = task.status === 'processing';

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5">
      <div className="shrink-0">
        {isProcessing ? (
          <svg className="h-4 w-4 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : isPending ? (
          <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-foreground">{task.stockName || task.stockCode}</span>
          <span className="text-xs text-muted-foreground">{task.stockCode}</span>
        </div>
        {task.message ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{task.message}</p> : null}
      </div>

      <div className="flex-shrink-0">
        <span className={isProcessing ? 'rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-xs text-primary' : 'rounded-full border border-border bg-muted px-2 py-1 text-xs text-muted-foreground'}>
          {isProcessing ? '分析中' : '等待中'}
        </span>
      </div>
    </div>
  );
};

interface TaskPanelProps {
  tasks: TaskInfo[];
  visible?: boolean;
  title?: string;
  className?: string;
}

export const TaskPanel: React.FC<TaskPanelProps> = ({
  tasks,
  visible = true,
  title = '分析任务',
  className = '',
}) => {
  const activeTasks = tasks.filter((task) => task.status === 'pending' || task.status === 'processing');
  const pendingCount = activeTasks.filter((task) => task.status === 'pending').length;
  const processingCount = activeTasks.filter((task) => task.status === 'processing').length;

  if (!visible) {
    return null;
  }

  return (
    <div className={`overflow-hidden rounded-2xl border border-border bg-card ${className}`}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {processingCount > 0 ? (
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              {processingCount} 进行中
            </span>
          ) : null}
          {pendingCount > 0 ? <span>{pendingCount} 等待中</span> : null}
          {activeTasks.length === 0 ? <span>当前为空</span> : null}
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto p-3">
        {activeTasks.length > 0 ? (
          <div className="space-y-2">
            {activeTasks.map((task) => (
              <TaskItem key={task.taskId} task={task} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background/60 px-4 py-8 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <ListTodo className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-foreground">当前没有进行中的任务</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">当你发起股票分析后，任务会在这里实时显示。</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskPanel;
