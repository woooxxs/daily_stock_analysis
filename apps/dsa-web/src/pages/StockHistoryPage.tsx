import type React from 'react';
import { ArrowLeft, Bot, FileText, RefreshCcw } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppPage, Button, PageHeader } from '../components/common';
import { StockHistoryPanel } from '../components/stock/StockHistoryPanel';
import { resolveDisplayStockName } from '../utils/stock';

const StockHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { stockCode: rawStockCode = '' } = useParams();
  const [searchParams] = useSearchParams();
  const stockCode = rawStockCode.toUpperCase();
  const queryName = searchParams.get('name') || '';
  const stockName = resolveDisplayStockName(stockCode, queryName);
  const askSearch = new URLSearchParams({ stock: stockCode, name: stockName, tab: 'ask' });

  return (
    <AppPage className="space-y-6">
      <PageHeader
        eyebrow="Stock History"
        icon={<FileText size={14} />}
        title={`${stockName} 历史记录`}
        description="左侧查看该股票的历史分析记录，右侧查看选中记录的完整分析报告。"
        actions={(
          <>
            <Button type="button" variant="secondary" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
              返回工作台
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate(`/?${askSearch.toString()}`)}>
              <Bot className="h-4 w-4" />
              AI 追问
            </Button>
            <Button type="button" onClick={() => navigate(0)}>
              <RefreshCcw className="h-4 w-4" />
              刷新历史
            </Button>
          </>
        )}
      />

      <StockHistoryPanel stockCode={stockCode} fallbackName={stockName} />
    </AppPage>
  );
};

export default StockHistoryPage;
