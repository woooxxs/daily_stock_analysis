import type React from 'react';
import { ArrowLeft, Compass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppPage, Button, EmptyState } from '../components/common';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <AppPage className="flex min-h-[calc(100vh-4rem)] items-center justify-center" width="default">
      <div className="w-full max-w-xl">
        <EmptyState
          icon={<Compass className="h-5 w-5" />}
          title="页面未找到"
          description="抱歉，您访问的页面不存在、已被移动，或者当前地址不再可用。"
          action={(
            <Button type="button" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
              返回首页
            </Button>
          )}
        />
      </div>
    </AppPage>
  );
};

export default NotFoundPage;
