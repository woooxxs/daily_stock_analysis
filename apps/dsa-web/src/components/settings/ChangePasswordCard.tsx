import type React from 'react';
import { useMemo, useState } from 'react';
import { EyeToggleIcon } from '../common';
import { useAuth } from '../../hooks';
import { SettingsAlert } from './SettingsAlert';

export const ChangePasswordCard: React.FC = () => {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const commonInputClass = 'input-terminal flex-1 w-full rounded-2xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed';

  const passwordHint = useMemo(() => {
    if (!newPassword) {
      return '至少 6 位。';
    }
    if (newPassword.length < 6) {
      return '长度不足 6 位。';
    }
    if (newPasswordConfirm && newPassword !== newPasswordConfirm) {
      return '两次输入不一致。';
    }
    return '可以提交。';
  }, [newPassword, newPasswordConfirm]);

  const clearFeedback = () => {
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearFeedback();

    if (!currentPassword || !newPassword || !newPasswordConfirm) {
      setError('请完整填写当前密码和新密码。');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setError('两次输入的新密码不一致。');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await changePassword(currentPassword, newPassword, newPasswordConfirm);
      if (!result.success) {
        setError(result.error ?? '修改失败');
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
      setSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-3xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur-sm md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">修改密码</h3>
          <p className="mt-1 text-sm text-muted-foreground">{passwordHint}</p>
        </div>
      </div>

      <form
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
        className="mt-5 grid gap-4 lg:grid-cols-3"
      >
        <div className="space-y-2">
          <label htmlFor="change-pass-current" className="text-sm font-semibold text-foreground">
            当前密码
          </label>
          <div className="flex items-center gap-2">
            <input
              id="change-pass-current"
              type={showCurrent ? 'text' : 'password'}
              className={commonInputClass}
              placeholder="输入当前密码"
              value={currentPassword}
              onChange={(event) => {
                clearFeedback();
                setCurrentPassword(event.target.value);
              }}
              disabled={isSubmitting}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="btn-secondary !p-2.5 shrink-0"
              disabled={isSubmitting}
              onClick={() => setShowCurrent((value) => !value)}
              title={showCurrent ? '隐藏' : '显示'}
              aria-label={showCurrent ? '隐藏密码' : '显示密码'}
            >
              <EyeToggleIcon visible={showCurrent} />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="change-pass-new" className="text-sm font-semibold text-foreground">
            新密码
          </label>
          <div className="flex items-center gap-2">
            <input
              id="change-pass-new"
              type={showNew ? 'text' : 'password'}
              className={commonInputClass}
              placeholder="输入新密码"
              value={newPassword}
              onChange={(event) => {
                clearFeedback();
                setNewPassword(event.target.value);
              }}
              disabled={isSubmitting}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="btn-secondary !p-2.5 shrink-0"
              disabled={isSubmitting}
              onClick={() => setShowNew((value) => !value)}
              title={showNew ? '隐藏' : '显示'}
              aria-label={showNew ? '隐藏密码' : '显示密码'}
            >
              <EyeToggleIcon visible={showNew} />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="change-pass-confirm" className="text-sm font-semibold text-foreground">
            确认新密码
          </label>
          <div className="flex items-center gap-2">
            <input
              id="change-pass-confirm"
              type={showConfirm ? 'text' : 'password'}
              className={commonInputClass}
              placeholder="再次输入新密码"
              value={newPasswordConfirm}
              onChange={(event) => {
                clearFeedback();
                setNewPasswordConfirm(event.target.value);
              }}
              disabled={isSubmitting}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="btn-secondary !p-2.5 shrink-0"
              disabled={isSubmitting}
              onClick={() => setShowConfirm((value) => !value)}
              title={showConfirm ? '隐藏' : '显示'}
              aria-label={showConfirm ? '隐藏密码' : '显示密码'}
            >
              <EyeToggleIcon visible={showConfirm} />
            </button>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-3">
          {error ? <SettingsAlert title="修改失败" message={error} variant="error" /> : null}
          {success ? <SettingsAlert title="修改成功" message="管理员密码已更新。" variant="success" /> : null}
          <div className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">修改后建议重新登录验证一次。</p>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? '修改中...' : '更新密码'}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
};
