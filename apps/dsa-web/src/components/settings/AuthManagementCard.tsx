import type React from 'react';
import { useMemo, useState } from 'react';
import { AlertTriangle, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../hooks';
import { Button, InlineAlert, SectionCard } from '../common';
import { EyeToggleIcon } from '../common';

export const AuthManagementCard: React.FC = () => {
  const { authEnabled, passwordSet, updateAuthSettings } = useAuth();
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEnableDialog, setShowEnableDialog] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const statusText = useMemo(() => {
    if (authEnabled) {
      return passwordSet ? '已启用密码登录' : '已启用，待设置密码';
    }
    return passwordSet ? '已关闭，可随时重新开启' : '未启用';
  }, [authEnabled, passwordSet]);

  const clearFeedback = () => {
    setError(null);
    setSuccessMessage(null);
  };

  const handleEnable = async () => {
    clearFeedback();
    if (!passwordSet && (!password || !passwordConfirm)) {
      setError('首次开启前请先设置管理员密码。');
      return false;
    }
    if ((password || passwordConfirm) && password !== passwordConfirm) {
      setError('两次输入的密码不一致。');
      return false;
    }

    setIsSubmitting(true);
    try {
      const result = await updateAuthSettings(true, password || undefined, passwordConfirm || undefined);
      if (!result.success) {
        setError(result.error ?? '开启失败');
        return false;
      }
      setPassword('');
      setPasswordConfirm('');
      setSuccessMessage(password || passwordConfirm ? '已开启并更新密码。' : '已开启密码登录。');
      return true;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisable = async () => {
    clearFeedback();
    setIsSubmitting(true);
    try {
      const result = await updateAuthSettings(false);
      if (!result.success) {
        setError(result.error ?? '关闭失败');
        return;
      }
      setShowDisableConfirm(false);
      setSuccessMessage('已关闭密码登录。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SectionCard title="密码登录">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background/70 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className={[
                'flex h-10 w-10 items-center justify-center rounded-xl',
                authEnabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
              ].join(' ')}>
                {authEnabled ? <ShieldCheck size={18} /> : <LockKeyhole size={18} />}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{statusText}</p>
                <p className="mt-1 text-sm text-muted-foreground">{passwordSet ? '已存在管理员密码。' : '密码至少 6 位。'}</p>
              </div>
            </div>
            {!authEnabled ? (
              <Button type="button" onClick={() => setShowEnableDialog(true)} isLoading={isSubmitting}>
                <ShieldCheck className="h-4 w-4" />
                开启密码登录
              </Button>
            ) : (
              <Button type="button" variant="danger" onClick={() => setShowDisableConfirm(true)} isLoading={isSubmitting}>
                关闭密码登录
              </Button>
            )}
          </div>

          {error ? <InlineAlert tone="error" message={error} /> : null}
          {successMessage ? <InlineAlert tone="success" message={successMessage} /> : null}
        </div>
      </SectionCard>

      {showEnableDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 px-4 backdrop-blur-sm dark:bg-slate-950/45" onClick={() => !isSubmitting && setShowEnableDialog(false)}>
          <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground">开启密码登录</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {passwordSet ? '如需同时更新密码，请在下方填写新密码。' : '首次开启需要先设置管理员密码。'}
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="auth-enable-password" className="text-sm font-medium text-foreground">
                  {passwordSet ? '新密码（可选）' : '管理员密码'}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="auth-enable-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => {
                      clearFeedback();
                      setPassword(event.target.value);
                    }}
                    placeholder={passwordSet ? '留空则沿用当前密码' : '请输入管理员密码'}
                    className="input-terminal flex-1"
                    disabled={isSubmitting}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="btn-secondary !h-10 !w-10 !px-0"
                    disabled={isSubmitting}
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    <EyeToggleIcon visible={showPassword} />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="auth-enable-password-confirm" className="text-sm font-medium text-foreground">
                  确认密码
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="auth-enable-password-confirm"
                    type={showPasswordConfirm ? 'text' : 'password'}
                    value={passwordConfirm}
                    onChange={(event) => {
                      clearFeedback();
                      setPasswordConfirm(event.target.value);
                    }}
                    placeholder="请再次输入密码"
                    className="input-terminal flex-1"
                    disabled={isSubmitting}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="btn-secondary !h-10 !w-10 !px-0"
                    disabled={isSubmitting}
                    onClick={() => setShowPasswordConfirm((value) => !value)}
                  >
                    <EyeToggleIcon visible={showPasswordConfirm} />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={() => setShowEnableDialog(false)} disabled={isSubmitting}>
                取消
              </Button>
              <Button
                type="button"
                onClick={async () => {
                  const success = await handleEnable();
                  if (success) {
                    setShowEnableDialog(false);
                  }
                }}
                isLoading={isSubmitting}
              >
                确定
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {showDisableConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 px-4 backdrop-blur-sm dark:bg-slate-950/45">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">确认关闭</h3>
                <p className="mt-2 text-sm text-muted-foreground">关闭后访问 Web 工作台将不再要求登录。</p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={() => setShowDisableConfirm(false)} disabled={isSubmitting}>
                取消
              </Button>
              <Button type="button" variant="danger" onClick={() => void handleDisable()} isLoading={isSubmitting}>
                确认关闭
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};
