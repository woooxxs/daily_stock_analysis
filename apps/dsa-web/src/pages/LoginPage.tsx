import type React from 'react';
import { useMemo, useState } from 'react';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, InlineAlert, Input } from '../components/common';
import { useAuth } from '../hooks';

const LoginPage: React.FC = () => {
  const { login, passwordSet } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawRedirect = searchParams.get('redirect') ?? '';
  const redirect = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/';

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFirstTime = !passwordSet;

  const title = useMemo(() => (isFirstTime ? '设置管理员密码' : '管理员密码登录'), [isFirstTime]);
  const description = useMemo(
    () => (isFirstTime ? '首次开启请设置管理员密码。' : '输入管理员密码后即可进入。'),
    [isFirstTime],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (isFirstTime && password !== passwordConfirm) {
      setError('两次输入的密码不一致');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login(password, isFirstTime ? passwordConfirm : undefined);
      if (result.success) {
        navigate(redirect, { replace: true });
        return;
      }

      setError(result.error ?? '登录失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-md items-center justify-center">
        <div className="w-full rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <LockKeyhole size={20} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Admin Access</p>
              <h2 className="mt-1 text-xl font-semibold text-foreground">{title}</h2>
            </div>
          </div>

          <p className="text-sm leading-6 text-muted-foreground">{description}</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input
              type="password"
              label={isFirstTime ? '设置密码' : '管理员密码'}
              placeholder={isFirstTime ? '请输入新的管理员密码' : '请输入管理员密码'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoFocus
              autoComplete={isFirstTime ? 'new-password' : 'current-password'}
            />

            {isFirstTime ? (
              <Input
                type="password"
                label="确认密码"
                placeholder="请再次输入管理员密码"
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                autoComplete="new-password"
              />
            ) : null}

            {error ? <InlineAlert tone="error" message={error} /> : null}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              isLoading={isSubmitting}
              disabled={!password || (isFirstTime && !passwordConfirm)}
            >
              {!isSubmitting ? <ArrowRight size={16} /> : null}
              {isFirstTime ? '完成初始化并进入' : '登录工作台'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
