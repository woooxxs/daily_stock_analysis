import type React from 'react';
import { useMemo, useState } from 'react';
import { AlertTriangle, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react';
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

  const passwordHint = useMemo(() => {
    if (passwordSet) {
      return authEnabled ? '密码登录已启用，可在下方继续修改密码。' : '已存在管理员密码，可直接重新开启密码登录。';
    }
    return '首次开启前需要先设置管理员密码，密码至少 6 位。';
  }, [authEnabled, passwordSet]);

  const clearFeedback = () => {
    if (error) {
      setError(null);
    }
    if (successMessage) {
      setSuccessMessage(null);
    }
  };

  const handleEnable = async () => {
    clearFeedback();
    if (!passwordSet && (!password || !passwordConfirm)) {
      setError('请先设置管理员密码，再开启密码登录。');
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
        setError(result.error ?? '开启密码登录失败');
        return false;
      }
      setPassword('');
      setPasswordConfirm('');
      setSuccessMessage(password || passwordConfirm ? '已开启密码登录，并更新管理员密码。' : '已开启密码登录。');
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
        setError(result.error ?? '关闭密码登录失败');
        return;
      }
      setShowDisableConfirm(false);
      setSuccessMessage('已关闭密码登录，后续访问将不再要求登录。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordInputType = showPassword ? 'text' : 'password';
  const passwordConfirmInputType = showPasswordConfirm ? 'text' : 'password';

  return (
    <>
      <SectionCard
        eyebrow="Security"
        title="密码登录管理"
        description="通过一个开关按钮控制 Web 管理员登录；开启时会弹出设置管理员密码的确认流程。"
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_320px]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-background px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">当前状态</p>
                <p className="mt-2 text-sm font-medium text-foreground">{authEnabled ? '已启用密码登录' : '未启用密码登录'}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">密码状态</p>
                <p className="mt-2 text-sm font-medium text-foreground">{passwordSet ? '已设置' : '未设置'}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">说明</p>
                <p className="mt-2 text-sm font-medium text-foreground">{passwordHint}</p>
              </div>
            </div>

            {error ? <InlineAlert tone="error" message={error} /> : null}
            {successMessage ? <InlineAlert tone="success" message={successMessage} /> : null}
          </div>

          <div className="rounded-2xl border border-border bg-background p-5">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${authEnabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                {authEnabled ? <ShieldCheck size={18} /> : <LockKeyhole size={18} />}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{authEnabled ? '密码登录已启用' : '密码登录未启用'}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{authEnabled ? '访问 Web 工作台时会强制要求管理员登录。' : '访问 Web 工作台时不会要求管理员登录。'}</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {!authEnabled ? (
                <Button type="button" className="w-full" onClick={() => setShowEnableDialog(true)} isLoading={isSubmitting}>
                  <ShieldCheck className="h-4 w-4" />
                  开启密码登录
                </Button>
              ) : (
                <Button type="button" variant="danger" className="w-full" onClick={() => setShowDisableConfirm(true)} disabled={isSubmitting}>
                  <EyeOff className="h-4 w-4" />
                  关闭密码登录
                </Button>
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      {showEnableDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm" onClick={() => !isSubmitting && setShowEnableDialog(false)}>
          <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">开启密码登录</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  点击确定后会立即启用管理员密码登录。{passwordSet ? '如不需要重置密码，可留空沿用当前密码。' : '首次开启需要先设置管理员密码。'}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="auth-enable-password" className="text-sm font-medium text-foreground">{passwordSet ? '设置新密码（可选）' : '设置管理员密码'}</label>
                <div className="flex items-center gap-2">
                  <input
                    id="auth-enable-password"
                    type={passwordInputType}
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
                <label htmlFor="auth-enable-password-confirm" className="text-sm font-medium text-foreground">{passwordSet ? '确认新密码' : '确认管理员密码'}</label>
                <div className="flex items-center gap-2">
                  <input
                    id="auth-enable-password-confirm"
                    type={passwordConfirmInputType}
                    value={passwordConfirm}
                    onChange={(event) => {
                      clearFeedback();
                      setPasswordConfirm(event.target.value);
                    }}
                    placeholder={passwordSet ? '如需修改密码，请再次输入新密码' : '请再次输入管理员密码'}
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
                确定并生效
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {showDisableConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">确认关闭密码登录</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  关闭后，访问 Web 工作台将不再要求输入管理员密码。当前不会要求再次输入密码，只需确认操作即可。
                </p>
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
