import type React from 'react';
import { useEffect, useMemo } from 'react';
import {
  BellRing,
  Cpu,
  RefreshCcw,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import { useAuth, useSystemConfig } from '../hooks';
import {
  AppPage,
  Button,
  EmptyState,
  InlineAlert,
  PageHeader,
  SectionCard,
  StickyActionBar,
  ToastViewport,
} from '../components/common';
import {
  AuthManagementCard,
  ChangePasswordCard,
  LLMChannelEditor,
  NotificationChannelManager,
  SettingsField,
  SettingsLoading,
} from '../components/settings';
import { getCategoryDescriptionZh, getCategoryTitleZh } from '../utils/systemConfigI18n';
import type { SystemConfigCategory, SystemConfigItem } from '../types/systemConfig';
import { cn } from '../utils/cn';

const categoryMeta: Record<SystemConfigCategory, { icon: React.ComponentType<{ className?: string; size?: number }> }> = {
  base: { icon: SlidersHorizontal },
  data_source: { icon: SlidersHorizontal },
  ai_model: { icon: Cpu },
  notification: { icon: BellRing },
  system: { icon: ShieldCheck },
  agent: { icon: Settings2 },
  backtest: { icon: Settings2 },
  uncategorized: { icon: Settings2 },
};

const visibleCategoryOrder: SystemConfigCategory[] = ['base', 'data_source', 'ai_model', 'notification', 'system'];

const systemVisibleKeys = new Set([
  'SCHEDULE_ENABLED',
  'SCHEDULE_TIME',
  'RUN_IMMEDIATELY',
  'SCHEDULE_RUN_IMMEDIATELY',
  'TRADING_DAY_CHECK_ENABLED',
  'MARKET_REVIEW_ENABLED',
  'MARKET_REVIEW_REGION',
  'ADMIN_SESSION_MAX_AGE_HOURS',
  'ANALYSIS_DELAY',
  'DATABASE_PATH',
  'WEBUI_ENABLED',
  'WEBUI_HOST',
  'WEBUI_PORT',
  'WEBUI_AUTO_BUILD',
  'TRUST_X_FORWARDED_FOR',
  'LOG_DIR',
  'LOG_LEVEL',
  'MAX_WORKERS',
]);

const dataSourceModules = [
  {
    title: '行情接口',
    description: '统一管理 Tushare、AkShare、EFinance、Pytdx、Baostock、YFinance 的优先级与盘中分析开关。',
    keys: ['TUSHARE_TOKEN', 'TUSHARE_PRIORITY', 'AKSHARE_PRIORITY', 'EFINANCE_PRIORITY', 'PYTDX_PRIORITY', 'BAOSTOCK_PRIORITY', 'YFINANCE_PRIORITY', 'REALTIME_SOURCE_PRIORITY', 'ENABLE_REALTIME_QUOTE', 'ENABLE_REALTIME_TECHNICAL_INDICATORS', 'ENABLE_CHIP_DISTRIBUTION', 'BIAS_THRESHOLD'],
  },
  {
    title: '新闻 / 联网检索',
    description: '配置 Tavily、SerpAPI、Brave、Bocha 等联网搜索能力，控制新闻抓取的上下文质量与时效。',
    keys: ['TAVILY_API_KEYS', 'SERPAPI_API_KEYS', 'BRAVE_API_KEYS', 'BOCHA_API_KEYS', 'NEWS_MAX_AGE_DAYS'],
  },
  {
    title: '图片识股',
    description: '配置视觉模型与供应商顺序，决定“从图片提取股票”优先调用哪个 Vision 能力。',
    keys: ['VISION_MODEL', 'VISION_PROVIDER_PRIORITY', 'OPENAI_VISION_MODEL'],
  },
  {
    title: '抓取兼容 / 代理',
    description: '管理通达信服务地址、网络代理和抓取兼容补丁，适合需要稳定数据抓取的部署环境。',
    keys: ['PYTDX_HOST', 'PYTDX_PORT', 'PYTDX_SERVERS', 'USE_PROXY', 'PROXY_HOST', 'PROXY_PORT', 'ENABLE_EASTMONEY_PATCH'],
  },
];

const homepageManagedKeys = new Set(['STOCK_LIST']);

const managedFieldHints: Partial<Record<string, string>> = {
  STOCK_LIST: '自选股列表已迁移到选股工作台维护，请前往首页的选股工作台进行添加、删除和刷新。',
};

function filterVisibleItems(category: SystemConfigCategory, items: SystemConfigItem[]): SystemConfigItem[] {
  const llmChannelKeyRe = /^LLM_[A-Z0-9]+_(BASE_URL|API_KEY|API_KEYS|MODELS|EXTRA_HEADERS)$/;

  if (category === 'ai_model') {
    return items.filter((item) => !llmChannelKeyRe.test(item.key) && item.key !== 'LLM_MODEL' && item.key !== 'LLM_BACKUP_MODEL');
  }

  if (category === 'system') {
    return items.filter((item) => systemVisibleKeys.has(item.key));
  }

  return items;
}

const SettingsPage: React.FC = () => {
  const { authEnabled, passwordChangeable } = useAuth();
  const {
    categories,
    itemsByCategory,
    issueByKey,
    activeCategory,
    setActiveCategory,
    hasDirty,
    dirtyCount,
    toast,
    clearToast,
    isLoading,
    isSaving,
    loadError,
    saveError,
    retryAction,
    load,
    retry,
    save,
    resetDraft,
    setDraftValue,
    configVersion,
    maskToken,
  } = useSystemConfig();

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => {
      clearToast();
    }, 3200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [clearToast, toast]);

  const visibleCategories = useMemo(
    () => categories.filter((category) => visibleCategoryOrder.includes(category.category)),
    [categories],
  );

  const rawActiveItems = itemsByCategory[activeCategory] || [];
  const activeItems = filterVisibleItems(activeCategory as SystemConfigCategory, rawActiveItems);

  const visibleCountByCategory = useMemo(() => {
    const next: Partial<Record<SystemConfigCategory, number>> = {};

    visibleCategories.forEach((category) => {
      next[category.category] = filterVisibleItems(category.category, itemsByCategory[category.category] || []).length;
    });

    return next;
  }, [itemsByCategory, visibleCategories]);

  const activeCategorySchema = visibleCategories.find((category) => category.category === activeCategory) ?? visibleCategories[0];
  const activeCategoryType = (activeCategorySchema?.category ?? 'base') as SystemConfigCategory;
  const activeTitle = getCategoryTitleZh(activeCategoryType, activeCategorySchema?.title);
  const activeDescription = getCategoryDescriptionZh(activeCategoryType, activeCategorySchema?.description);
  const ActiveIcon = categoryMeta[activeCategoryType].icon;
  const settingsToastItems = toast ? [{ id: 1, type: toast.type, message: toast.message }] : [];

  const renderFieldList = (items: SystemConfigItem[]) => (
    <div className="space-y-3">
      {items.map((item) => (
        <SettingsField
          key={item.key}
          item={item}
          value={item.value}
          disabled={isSaving || homepageManagedKeys.has(item.key)}
          managedHint={managedFieldHints[item.key]}
          onChange={setDraftValue}
          issues={issueByKey[item.key] || []}
        />
      ))}
    </div>
  );

  return (
    <AppPage className="space-y-6">
      <PageHeader
        eyebrow="Settings Center"
        icon={<Sparkles size={14} />}
        title="系统配置中心"
        description="将常用配置按任务分组展示，减少直接面对 .env 字段的理解成本。"
      />

      {loadError ? (
        <InlineAlert
          tone="error"
          title="加载设置失败"
          message={loadError}
          action={
            <Button type="button" variant="secondary" onClick={() => void retry()}>
              {retryAction === 'load' ? '重试加载' : '重新加载'}
            </Button>
          }
        />
      ) : null}

      {saveError ? (
        <InlineAlert
          tone="error"
          title="保存失败"
          message={saveError}
          action={
            retryAction === 'save' ? (
              <Button type="button" variant="secondary" onClick={() => void retry()}>
                重试保存
              </Button>
            ) : undefined
          }
        />
      ) : null}

      {isLoading ? (
        <SettingsLoading />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <SectionCard eyebrow="Configuration" title="配置导航" description="按业务任务切换设置分组。" contentClassName="space-y-2">
              {visibleCategories.map((category) => {
                const isActive = category.category === activeCategory;
                const Icon = categoryMeta[category.category].icon;
                const title = getCategoryTitleZh(category.category, category.title);
                const description = getCategoryDescriptionZh(category.category, category.description);
                const count = visibleCountByCategory[category.category] || 0;

                return (
                  <button
                    key={category.category}
                    type="button"
                    onClick={() => setActiveCategory(category.category)}
                    className={cn(
                      'w-full rounded-2xl border px-4 py-3 text-left transition-all',
                      isActive
                        ? 'border-primary/20 bg-primary/10 shadow-sm'
                        : 'border-border bg-background hover:border-primary/20 hover:bg-accent/40',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 gap-3">
                        <div
                          className={cn(
                            'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border',
                            isActive ? 'border-primary/20 bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground',
                          )}
                        >
                          <Icon size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className={cn('text-sm font-semibold', isActive ? 'text-primary' : 'text-foreground')}>{title}</p>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{description}</p>
                        </div>
                      </div>
                      <span className={cn('rounded-full px-2 py-1 text-xs font-medium', isActive ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground')}>
                        {count}
                      </span>
                    </div>
                  </button>
                );
              })}
            </SectionCard>
          </aside>

          <section className="space-y-5">
            <SectionCard
              eyebrow="Active Module"
              title={activeTitle}
              description={activeDescription}
              actions={
                hasDirty ? (
                  <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                    有未保存修改
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                    配置已同步
                  </span>
                )
              }
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary shadow-sm">
                  <ActiveIcon size={22} />
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  常用配置集中展示；高级字段仍保留在对应分组中，避免直接暴露全部环境变量细节。
                </p>
              </div>
            </SectionCard>

            {activeCategoryType === 'ai_model' ? (
              <>
                <SectionCard eyebrow="AI Model" title="AI 模型配置" description="统一管理模型渠道、主模型和备选模型。">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <WandSparkles size={18} />
                    </div>
                    <p>推荐优先通过渠道编辑器管理多模型接入，减少手动维护多个环境变量的复杂度。</p>
                  </div>
                </SectionCard>
                <SectionCard contentClassName="p-0">
                  <LLMChannelEditor
                    key={configVersion || 'llm-editor'}
                    items={rawActiveItems}
                    configVersion={configVersion}
                    maskToken={maskToken}
                    onSaved={() => void load()}
                    disabled={isSaving || isLoading}
                  />
                </SectionCard>
              </>
            ) : null}

            {activeCategoryType === 'notification' ? (
              <SectionCard eyebrow="Notification" title="通知渠道管理" description="按渠道集中展示可用配置，减少散落字段的理解成本。" contentClassName="p-0">
                <NotificationChannelManager
                  key={configVersion || 'notification-manager'}
                  items={activeItems}
                  issueByKey={issueByKey}
                  onChange={setDraftValue}
                  disabled={isSaving || isLoading}
                />
              </SectionCard>
            ) : null}

            {activeCategoryType === 'data_source' ? (
              <SectionCard eyebrow="Data Sources" title="数据源概览" description="先按用途理解配置，再按需展开下面的具体字段。">
                <div className="grid gap-4 xl:grid-cols-2">
                  {dataSourceModules.map((module) => {
                    const configuredCount = module.keys.filter((key) => activeItems.some((item) => item.key === key && item.value.trim())).length;
                    return (
                      <div key={module.title} className="rounded-2xl border border-border bg-background/70 p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">{module.title}</h3>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">{module.description}</p>
                          </div>
                          <span className="rounded-full border border-primary/15 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                            {configuredCount}/{module.keys.length}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            ) : null}

            {activeCategoryType === 'system' ? <AuthManagementCard /> : null}

            {activeCategoryType === 'system' && authEnabled && passwordChangeable ? <ChangePasswordCard /> : null}

            {activeCategoryType !== 'ai_model' && activeCategoryType !== 'notification' && activeItems.length ? (
              <SectionCard eyebrow="Configuration Fields" title={`${activeTitle} 配置项`} description="直接修改后可即时校验并保存到当前配置源。">
                {renderFieldList(activeItems)}
              </SectionCard>
            ) : null}

            {activeCategoryType !== 'ai_model' && activeCategoryType !== 'notification' && !activeItems.length ? (
              <EmptyState title="当前分类下暂无可展示的配置项" description="请切换到其他分类，或确认当前配置 schema 中是否已注册对应字段。" />
            ) : null}

            <StickyActionBar>
              <div>
                <p className="text-sm font-medium text-foreground">{hasDirty ? `有 ${dirtyCount} 项修改待保存` : '当前没有待保存修改'}</p>
                <p className="text-xs text-muted-foreground">保存后会执行现有的校验与配置刷新流程。</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" variant="outline" onClick={() => void load()} disabled={isLoading || isSaving}>
                  <RefreshCcw className="h-4 w-4" />
                  重新加载
                </Button>
                <Button type="button" variant="ghost" onClick={() => resetDraft()} disabled={!hasDirty || isLoading || isSaving}>
                  <RotateCcw className="h-4 w-4" />
                  放弃修改
                </Button>
                <Button type="button" onClick={() => void save()} disabled={!hasDirty || isSaving || isLoading} isLoading={isSaving}>
                  <Save className="h-4 w-4" />
                  {isSaving ? '保存中...' : `保存配置${dirtyCount ? ` (${dirtyCount})` : ''}`}
                </Button>
              </div>
            </StickyActionBar>
          </section>
        </div>
      )}

      <ToastViewport items={settingsToastItems} onDismiss={() => clearToast()} />
    </AppPage>
  );
};

export default SettingsPage;
