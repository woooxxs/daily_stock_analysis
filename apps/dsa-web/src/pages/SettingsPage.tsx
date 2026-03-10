import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  Bot,
  Cpu,
  Database,
  FlaskConical,
  Globe,
  RefreshCcw,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { useAuth, useSystemConfig } from '../hooks';
import {
  ApiErrorAlert,
  AppPage,
  Button,
  Collapsible,
  EmptyState,
  PageHeader,
  SectionCard,
  StickyActionBar,
  ToastViewport,
} from '../components/common';
import {
  AuthManagementCard,
  ChangePasswordCard,
  DataSourceManager,
  LLMChannelEditor,
  NotificationChannelManager,
  SettingsField,
  SettingsLoading,
  SmartModelAddDialog,
} from '../components/settings';
import type { SystemConfigItem } from '../types/systemConfig';
import { cn } from '../utils/cn';

type SettingsSectionId =
  | 'ai-model'
  | 'data-source'
  | 'proxy'
  | 'notification'
  | 'website'
  | 'backtest'
  | 'agent'
  | 'security'
  | 'schedule'
  | 'other';

type SettingsSection = {
  id: SettingsSectionId;
  title: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  count: number;
};

const STOCK_LIST_HINT = '自选股列表请到首页工作台维护。';
const STOCK_LIST_KEYS = new Set(['STOCK_LIST']);
const VISION_KEYS = new Set(['VISION_MODEL', 'VISION_PROVIDER_PRIORITY', 'OPENAI_VISION_MODEL']);
const DATA_SOURCE_MANAGER_KEYS = new Set([
  'TUSHARE_TOKEN',
  'TAVILY_API_KEYS',
  'SERPAPI_API_KEYS',
  'BRAVE_API_KEYS',
  'BOCHA_API_KEYS',
  'ENABLE_EASTMONEY_PATCH',
  'PYTDX_HOST',
  'PYTDX_PORT',
  'PYTDX_SERVERS',
]);
const DATA_SOURCE_PRIORITY_KEYS = new Set([
  'TUSHARE_PRIORITY',
  'AKSHARE_PRIORITY',
  'EFINANCE_PRIORITY',
  'PYTDX_PRIORITY',
  'BAOSTOCK_PRIORITY',
  'YFINANCE_PRIORITY',
  'REALTIME_SOURCE_PRIORITY',
]);
const DATA_SOURCE_CONFIG_KEYS = new Set([
  'ENABLE_REALTIME_TECHNICAL_INDICATORS',
  'ENABLE_REALTIME_QUOTE',
  'ENABLE_CHIP_DISTRIBUTION',
  'MAX_WORKERS',
  'ANALYSIS_DELAY',
  'NEWS_MAX_AGE_DAYS',
  'BIAS_THRESHOLD',
]);
const PROXY_KEYS = new Set(['USE_PROXY', 'PROXY_HOST', 'PROXY_PORT', 'HTTP_PROXY']);
const SCHEDULE_KEYS = new Set([
  'SCHEDULE_ENABLED',
  'SCHEDULE_TIME',
  'SCHEDULE_RUN_IMMEDIATELY',
  'RUN_IMMEDIATELY',
  'TRADING_DAY_CHECK_ENABLED',
  'MARKET_REVIEW_ENABLED',
  'MARKET_REVIEW_REGION',
]);
const SECURITY_FIELD_KEYS = new Set(['ADMIN_SESSION_MAX_AGE_HOURS']);
const BACKTEST_SETTING_KEYS = new Set([
  'BACKTEST_ENABLED',
  'BACKTEST_EVAL_WINDOW_DAYS',
  'BACKTEST_MIN_AGE_DAYS',
  'BACKTEST_ENGINE_VERSION',
  'BACKTEST_NEUTRAL_BAND_PCT',
]);
const AGENT_SETTING_KEYS = new Set([
  'AGENT_MODE',
  'AGENT_MAX_STEPS',
  'AGENT_SKILLS',
  'AGENT_STRATEGY_DIR',
]);
const WEBSITE_SETTING_KEYS = new Set([
  'WEBUI_ENABLED',
  'WEBUI_HOST',
  'API_PORT',
  'WEBUI_PORT',
  'WEBUI_AUTO_BUILD',
  'TRUST_X_FORWARDED_FOR',
  'LOG_DIR',
  'LOG_LEVEL',
  'DEBUG',
  'DATABASE_PATH',
]);
const REPORT_SETTING_KEYS = new Set([
  'REPORT_SUMMARY_ONLY',
  'SINGLE_STOCK_NOTIFY',
  'REPORT_TYPE',
  'REPORT_TEMPLATES_DIR',
  'REPORT_RENDERER_ENABLED',
  'REPORT_INTEGRITY_ENABLED',
  'REPORT_INTEGRITY_RETRY',
  'REPORT_HISTORY_COMPARE_N',
  'MERGE_EMAIL_NOTIFICATION',
]);
const HIDDEN_GENERIC_KEYS = new Set([
  'ADMIN_AUTH_ENABLED',
  'LLM_MODEL',
  'LLM_BACKUP_MODEL',
  'LITELLM_CONFIG',
  'STOCK_LIST',
  'GPG_KEY',
  'JWT_DEVICE_ID',
  'JWT_PRIVATE_KEY',
  'LANG',
  'PATH',
  'PYTHON_SHA256',
  'PYTHON_VERSION',
  'PYTHONUNBUFFERED',
  'WEB_ADMIN_PASSWORD_HASH',
  'WEB_ADMIN_USERNAME',
  'TZ',
]);
const LLM_CHANNEL_KEY_RE = /^LLM_[A-Z0-9]+_(BASE_URL|API_KEY|API_KEYS|MODELS|EXTRA_HEADERS)$/;
const NOTIFICATION_KEY_RE = /^(WECHAT_|FEISHU_|TELEGRAM_|EMAIL_|PUSHPLUS_|PUSHOVER_|CUSTOM_WEBHOOK_|WEBHOOK_|DISCORD_|SERVERCHAN3_|DINGTALK_)/;

function matchesAiManagedKey(key: string): boolean {
  return key === 'LLM_CHANNELS'
    || key === 'LITELLM_MODEL'
    || key === 'LITELLM_FALLBACK_MODELS'
    || LLM_CHANNEL_KEY_RE.test(key);
}

function matchesNotificationManagedKey(key: string): boolean {
  return NOTIFICATION_KEY_RE.test(key);
}

function renderFieldList(items: SystemConfigItem[], issueByKey: Record<string, unknown[]>, isSaving: boolean, onChange: (key: string, value: string) => void) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <SettingsField
          key={item.key}
          item={item}
          value={item.value}
          disabled={isSaving || STOCK_LIST_KEYS.has(item.key)}
          managedHint={STOCK_LIST_KEYS.has(item.key) ? STOCK_LIST_HINT : undefined}
          onChange={onChange}
          issues={(issueByKey[item.key] || []) as never[]}
        />
      ))}
    </div>
  );
}

const SettingsPage: React.FC = () => {
  const { authEnabled, passwordChangeable } = useAuth();
  const {
    items,
    issueByKey,
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
    setDraftItemEnabled,
    configVersion,
    maskToken,
  } = useSystemConfig();
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('ai-model');

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => clearToast(), 3200);
    return () => window.clearTimeout(timer);
  }, [clearToast, toast]);

  const aiItems = useMemo(() => items.filter((item) => item.schema?.category === 'ai_model'), [items]);
  const visionItems = useMemo(() => items.filter((item) => VISION_KEYS.has(item.key)), [items]);
  const aiSupplementalItems = useMemo(
    () => aiItems.filter((item) => !matchesAiManagedKey(item.key) && !VISION_KEYS.has(item.key)),
    [aiItems],
  );
  const dataSourceItems = useMemo(() => items.filter((item) => DATA_SOURCE_MANAGER_KEYS.has(item.key)), [items]);
  const dataSourcePriorityItems = useMemo(() => items.filter((item) => DATA_SOURCE_PRIORITY_KEYS.has(item.key)), [items]);
  const dataSourceConfigItems = useMemo(() => items.filter((item) => DATA_SOURCE_CONFIG_KEYS.has(item.key)), [items]);
  const proxyItems = useMemo(() => {
    const entries = items.filter((item) => PROXY_KEYS.has(item.key));
    return entries.sort((left, right) => {
      if (left.key === 'USE_PROXY') return -1;
      if (right.key === 'USE_PROXY') return 1;
      if (left.key === 'HTTP_PROXY') return 1;
      if (right.key === 'HTTP_PROXY') return -1;
      return left.key.localeCompare(right.key);
    });
  }, [items]);
  const notificationItems = useMemo(() => items.filter((item) => matchesNotificationManagedKey(item.key)), [items]);
  const reportSettingItems = useMemo(() => items.filter((item) => REPORT_SETTING_KEYS.has(item.key)), [items]);
  const websiteItems = useMemo(() => items.filter((item) => WEBSITE_SETTING_KEYS.has(item.key)), [items]);
  const backtestItems = useMemo(() => items.filter((item) => BACKTEST_SETTING_KEYS.has(item.key)), [items]);
  const agentItems = useMemo(() => items.filter((item) => AGENT_SETTING_KEYS.has(item.key)), [items]);
  const securityFieldItems = useMemo(() => items.filter((item) => SECURITY_FIELD_KEYS.has(item.key)), [items]);
  const scheduleItems = useMemo(() => items.filter((item) => SCHEDULE_KEYS.has(item.key)), [items]);

  const handledKeys = useMemo(() => {
    const next = new Set<string>();
    [...aiItems, ...visionItems, ...dataSourceItems, ...dataSourceConfigItems, ...proxyItems, ...notificationItems, ...reportSettingItems, ...websiteItems, ...backtestItems, ...agentItems, ...securityFieldItems, ...scheduleItems].forEach((item) => {
      next.add(item.key);
    });
    dataSourcePriorityItems.forEach((item) => next.add(item.key));
    HIDDEN_GENERIC_KEYS.forEach((key) => next.add(key));
    return next;
  }, [aiItems, dataSourceItems, dataSourcePriorityItems, dataSourceConfigItems, notificationItems, reportSettingItems, proxyItems, scheduleItems, securityFieldItems, visionItems, websiteItems, backtestItems, agentItems]);

  const otherItems = useMemo(
    () => items.filter((item) => !handledKeys.has(item.key) && !matchesAiManagedKey(item.key) && !matchesNotificationManagedKey(item.key)),
    [handledKeys, items],
  );

  const sections = useMemo<SettingsSection[]>(() => [
    { id: 'ai-model', title: 'AI 模型', icon: Cpu, count: aiItems.length },
    { id: 'data-source', title: '数据源', icon: Database, count: dataSourceItems.length },
    { id: 'notification', title: '通知渠道', icon: BellRing, count: notificationItems.length + reportSettingItems.length },
    { id: 'backtest', title: '回测设置', icon: FlaskConical, count: backtestItems.length },
    { id: 'agent', title: 'Agent 设置', icon: Bot, count: agentItems.length },
    { id: 'security', title: '安全设置', icon: ShieldCheck, count: securityFieldItems.length + 2 },
    { id: 'schedule', title: '定时任务', icon: RefreshCcw, count: scheduleItems.length },
    { id: 'website', title: '网站设置', icon: Globe, count: websiteItems.length },
    { id: 'proxy', title: '代理设置', icon: Settings2, count: proxyItems.length },
    { id: 'other', title: '其他设置', icon: SlidersHorizontal, count: otherItems.length },
  ], [aiItems.length, dataSourceItems.length, notificationItems.length, reportSettingItems.length, otherItems.length, proxyItems.length, scheduleItems.length, securityFieldItems.length, websiteItems.length, backtestItems.length, agentItems.length, visionItems.length]);

  const toastItems = toast ? [{ id: 1, type: toast.type, title: toast.type === 'error' ? toast.error.title : undefined, message: toast.type === 'error' ? toast.error.message : toast.message }] : [];

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'ai-model':
        return (
          <div className="space-y-5">
            <SectionCard
              title="快速配置"
              description="从一个入口快速添加模型渠道或 MiniMax 扩展能力。普通用户只需要先选类型、提供商，再补 API Key 与模型列表。"
              actions={(
                <SmartModelAddDialog
                  items={aiItems}
                  configVersion={configVersion}
                  maskToken={maskToken}
                  disabled={isSaving || isLoading}
                  onSaved={() => void load()}
                />
              )}
            >
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>快速配置主写 `LLM_CHANNELS` 与 `LLM_&lt;NAME&gt;_*`，不会自动同步旧版兼容 key。</p>
                <p>如果你已经在其他栏目有未保存的修改，建议先保存当前页面，再添加新模型，避免刷新后丢失草稿。</p>
              </div>
            </SectionCard>

            <SectionCard title="已配置模型" description="这里用于查看与手动维护现有模型渠道、主模型、备选模型和视觉模型。" contentClassName="p-0">
              <LLMChannelEditor
                key={configVersion || 'llm-editor'}
                items={aiItems}
                configVersion={configVersion}
                maskToken={maskToken}
                onSaved={() => void load()}
                onChangeVision={setDraftValue}
                visionItems={visionItems}
                disabled={isSaving || isLoading}
              />
            </SectionCard>

            {aiSupplementalItems.length ? (
              <SectionCard
                title="兼容密钥与高级参数"
                description="这些键继续支持手工维护；快速添加不会自动同步到这里。适合直接编辑旧版 `OPENAI_* / DEEPSEEK_* / GEMINI_* / ANTHROPIC_*` 与 MiniMax 扩展能力。"
              >
                <Collapsible title="展开手工维护区" defaultOpen={false}>
                  {renderFieldList(aiSupplementalItems, issueByKey, isSaving, setDraftValue)}
                </Collapsible>
              </SectionCard>
            ) : null}
          </div>
        );
      case 'data-source':
        return (
          <SectionCard contentClassName="p-0">
            <DataSourceManager
              key={configVersion || 'data-source-manager'}
              items={dataSourceItems}
              priorityItems={dataSourcePriorityItems}
              configItems={dataSourceConfigItems}
              issueByKey={issueByKey}
              onChange={setDraftValue}
              onToggleEnabled={setDraftItemEnabled}
              disabled={isSaving || isLoading}
            />
          </SectionCard>
        );
      case 'proxy':
        return (
          <SectionCard title="代理设置">
            {proxyItems.length ? renderFieldList(proxyItems, issueByKey, isSaving, setDraftValue) : <EmptyState title="暂无代理配置" />}
          </SectionCard>
        );
      case 'notification':
        return (
          <div className="space-y-5">
            <SectionCard
              title="报告设置"
              description="控制报告格式、模板渲染、完整性校验与历史对比，不影响渠道认证信息。"
            >
              {reportSettingItems.length ? renderFieldList(reportSettingItems, issueByKey, isSaving, setDraftValue) : <EmptyState title="暂无报告设置" />}
            </SectionCard>

            <SectionCard contentClassName="p-0">
              <NotificationChannelManager
                key={configVersion || 'notification-manager'}
                items={notificationItems}
                issueByKey={issueByKey}
                onChange={setDraftValue}
                onToggleEnabled={setDraftItemEnabled}
                disabled={isSaving || isLoading}
              />
            </SectionCard>
          </div>
        );
      case 'website':
        return (
          <SectionCard title="网站设置">
            {websiteItems.length ? renderFieldList(websiteItems, issueByKey, isSaving, setDraftValue) : <EmptyState title="暂无网站设置" />}
          </SectionCard>
        );
      case 'backtest':
        return (
          <SectionCard title="回测设置">
            {backtestItems.length ? renderFieldList(backtestItems, issueByKey, isSaving, setDraftValue) : <EmptyState title="暂无回测设置" />}
          </SectionCard>
        );
      case 'agent':
        return (
          <SectionCard title="Agent 设置">
            {agentItems.length ? renderFieldList(agentItems, issueByKey, isSaving, setDraftValue) : <EmptyState title="暂无 Agent 设置" />}
          </SectionCard>
        );
      case 'security':
        return (
          <div className="space-y-5">
            <AuthManagementCard />
            {authEnabled && passwordChangeable ? <ChangePasswordCard /> : null}
            {securityFieldItems.length ? (
              <SectionCard title="会话设置">
                {renderFieldList(securityFieldItems, issueByKey, isSaving, setDraftValue)}
              </SectionCard>
            ) : null}
          </div>
        );
      case 'schedule':
        return (
          <SectionCard title="定时任务">
            {scheduleItems.length ? renderFieldList(scheduleItems, issueByKey, isSaving, setDraftValue) : <EmptyState title="暂无定时任务配置" />}
          </SectionCard>
        );
      case 'other':
        return (
          <SectionCard title="其他设置">
            {otherItems.length ? renderFieldList(otherItems, issueByKey, isSaving, setDraftValue) : <EmptyState title="暂无其他配置" />}
          </SectionCard>
        );
      default:
        return null;
    }
  };

  return (
    <AppPage className="space-y-6">
      <PageHeader eyebrow="Settings" icon={<Sparkles size={14} />} title="系统配置" description="按用途整理环境配置。" />

      {loadError ? (
        <ApiErrorAlert
          error={loadError}
          actionLabel={retryAction === 'load' ? '重试加载' : '重新加载'}
          onAction={() => void retry()}
        />
      ) : null}

      {saveError ? (
        <ApiErrorAlert
          error={saveError}
          actionLabel={retryAction === 'save' ? '重试保存' : undefined}
          onAction={retryAction === 'save' ? () => void retry() : undefined}
        />
      ) : null}

      {isLoading ? (
        <SettingsLoading />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <SectionCard title="配置菜单" contentClassName="space-y-2">
              {sections.map((section) => {
                const Icon = section.icon;
                const active = section.id === activeSection;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
                      active ? 'bg-primary/10 text-primary ring-1 ring-primary/15' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <Icon size={16} className={cn(active ? 'text-primary' : 'text-muted-foreground')} />
                      <span>{section.title}</span>
                    </span>
                    <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
                      {section.count}
                    </span>
                  </button>
                );
              })}
            </SectionCard>
          </aside>

          <section className="space-y-5">{renderActiveSection()}</section>
        </div>
      )}

      {hasDirty ? (
        <StickyActionBar className="justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">有未保存修改</p>
            <p className="mt-1 text-sm text-muted-foreground">共 {dirtyCount} 项。</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="secondary" onClick={resetDraft} disabled={isSaving}>
              <RotateCcw className="h-4 w-4" />
              放弃修改
            </Button>
            <Button type="button" onClick={() => void save()} isLoading={isSaving} disabled={isSaving || !hasDirty}>
              <Save className="h-4 w-4" />
              保存配置
            </Button>
          </div>
        </StickyActionBar>
      ) : null}

      <ToastViewport items={toastItems} onDismiss={() => clearToast()} />
    </AppPage>
  );
};

export default SettingsPage;
