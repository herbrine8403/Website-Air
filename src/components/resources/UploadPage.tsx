import { useState, useCallback, type FormEvent, type DragEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Upload as UploadIcon,
  FileText,
  Download,
  Clock,
  Check,
  X,
  AlertTriangle,
  ImageIcon,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Info,
  Package,
  Zap,
  Sun,
  Monitor,
  AppWindow,
  File as FileIcon,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import {
  RESOURCE_TYPES,
  PageContainer,
} from './shared';
import { MC_VERSION_GROUPS } from './mc-versions';

type StepKey = 1 | 2 | 3;
const STEPS: Array<{ key: StepKey; label: string; desc: string }> = [
  { key: 1, label: '基本信息', desc: '名称与分类' },
  { key: 2, label: '文件上传', desc: '资源文件' },
  { key: 3, label: '版本信息', desc: '版本与兼容' },
];

const IOS_TAGS = ['iOS移植', '修改版', '触屏适配', 'AirPack', 'TrollStore'];
const LOADERS = ['Fabric', 'Forge', 'NeoForge', 'Quilt', 'LiteLoader'];
// 游戏版本列表从 ./mc-versions 导入（MC_VERSION_GROUPS）
const ALLOWED_EXTENSIONS = ['.mrpack', '.airpack', '.jar', '.zip', '.ipa', '.tipa', '.mcpack'];

interface UploadedFile {
  name: string;
  size: string;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  key?: string; // TOS 对象 key（Air 官网下载源上传后返回）
  rawSize?: number; // 原始字节数
  errorMsg?: string; // 上传失败时的错误信息
}

interface SourceState {
  modrinth: { enabled: boolean; url: string };
  curseforge: { enabled: boolean; url: string };
  github: { enabled: boolean; url: string };
  air: { enabled: boolean };
}

interface FormState {
  name: string;
  summary: string;
  description: string;
  type: string;
  tags: string[];
  coverUrl: string;
  versionNumber: string;
  versionType: 'release' | 'beta' | 'alpha';
  loaders: string[];
  gameVersions: string[];
  changelog: string;
  sources: SourceState;
}

const INITIAL_FORM: FormState = {
  name: '',
  summary: '',
  description: '',
  type: 'modpack',
  tags: [],
  coverUrl: '',
  versionNumber: '1.0.0',
  versionType: 'release',
  loaders: [],
  gameVersions: [],
  changelog: '',
  sources: {
    modrinth: { enabled: false, url: '' },
    curseforge: { enabled: false, url: '' },
    github: { enabled: false, url: '' },
    air: { enabled: false },
  },
};

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000_000) return (bytes / 1_000_000_000).toFixed(1) + ' GB';
  if (bytes >= 1_000_000) return (bytes / 1_000_000).toFixed(1) + ' MB';
  if (bytes >= 1_000) return (bytes / 1_000).toFixed(1) + ' KB';
  return bytes + ' B';
}

export default function UploadPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<StepKey>(1);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [coverDragOver, setCoverDragOver] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const updateForm = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleArrayValue = useCallback((key: 'tags' | 'loaders' | 'gameVersions', value: string) => {
    setForm((prev) => {
      const arr = prev[key];
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      return { ...prev, [key]: next };
    });
  }, []);

  const toggleSource = useCallback((key: keyof SourceState) => {
    setForm((prev) => ({
      ...prev,
      sources: {
        ...prev.sources,
        [key]: {
          ...prev.sources[key],
          enabled: !prev.sources[key].enabled,
        },
      },
    }));
  }, []);

  const updateSourceUrl = useCallback((key: 'modrinth' | 'curseforge' | 'github', url: string) => {
    setForm((prev) => ({
      ...prev,
      sources: {
        ...prev.sources,
        [key]: { ...prev.sources[key], url },
      },
    }));
  }, []);

  // 上传文件到 TOS（Air 官网下载源）
  const uploadToTos = useCallback(async (file: File) => {
    const newFile: UploadedFile = {
      name: file.name,
      size: formatBytes(file.size),
      rawSize: file.size,
      progress: 0,
      status: 'uploading',
    };
    setFiles((prev) => [...prev, newFile]);

    try {
      // 1. 获取预签名上传 URL（传入 file_size 用于去重）
      const presignRes = await api.post<{
        success: boolean;
        exists?: boolean;
        upload_url?: string;
        key: string;
        message?: string;
        headers?: Record<string, string>;
      }>('/resources/air-upload.php', {
        filename: file.name,
        content_type: file.type || 'application/octet-stream',
        file_size: file.size,
      });

      if (!presignRes.success) {
        throw new Error('获取上传地址失败');
      }

      // 2. 如果后端检测到对象已存在，跳过 PUT 直接复用
      if (presignRes.exists) {
        console.log('[TOS Dedup] 文件已存在，跳过上传:', presignRes.key, presignRes.message);
        setFiles((prev) =>
          prev.map((f) =>
            f.name === newFile.name
              ? { ...f, progress: 100, status: 'done', key: presignRes.key }
              : f
          )
        );
        return;
      }

      if (!presignRes.upload_url) {
        throw new Error('未返回上传地址');
      }

      // 3. 使用 XMLHttpRequest 上传（支持进度回调）
      // 注意：不显式设置 Content-Type，避免触发 CORS 预检请求
      // TOS 会使用默认值 application/octet-stream，对二进制文件无影响
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', presignRes.upload_url!);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setFiles((prev) =>
              prev.map((f) =>
                f.name === newFile.name ? { ...f, progress } : f
              )
            );
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            // 捕获 TOS 返回的错误响应体
            const body = xhr.responseText || '';
            console.error('[TOS Upload Error]', {
              status: xhr.status,
              statusText: xhr.statusText,
              response: body,
              key: presignRes.key,
              uploadUrl: presignRes.upload_url,
            });
            let detail = '';
            try {
              const j = JSON.parse(body);
              detail = j.Message || j.message || j.error || '';
              if (j.Code) detail = `${j.Code}: ${detail}`;
            } catch {
              detail = body.slice(0, 200);
            }
            reject(new Error(`上传失败 HTTP ${xhr.status} ${detail}`));
          }
        };

        xhr.onerror = () => {
          // CORS 错误时浏览器不会给详细响应，只能提示
          console.error('[TOS Upload Network Error]', {
            status: xhr.status,
            statusText: xhr.statusText,
            key: presignRes.key,
          });
          reject(new Error('网络/CORS 错误，上传失败（请检查 TOS 控制台 CORS 配置）'));
        };
        xhr.send(file);
      });

      // 4. 标记上传完成，记录 key
      setFiles((prev) =>
        prev.map((f) =>
          f.name === newFile.name
            ? { ...f, progress: 100, status: 'done', key: presignRes.key }
            : f
        )
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '上传失败';
      setFiles((prev) =>
        prev.map((f) =>
          f.name === newFile.name
            ? { ...f, status: 'error', errorMsg }
            : f
        )
      );
      // 同时移除其他同名 uploading 状态的文件
      throw err;
    }
  }, []);

  const handleFileDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      // 仅处理第一个文件（Air 源单文件上传）
      const file = droppedFiles[0];
      if (!file) return;
      const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        alert(`不支持的文件格式: ${file.name}（仅支持 ${ALLOWED_EXTENSIONS.join(', ')}）`);
        return;
      }
      // 真实上传到 TOS
      uploadToTos(file).catch(() => {
        // 错误已在 uploadToTos 中处理
      });
    },
    [uploadToTos]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);
      const file = selectedFiles[0];
      if (!file) return;
      const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        alert(`不支持的文件格式: ${file.name}（仅支持 ${ALLOWED_EXTENSIONS.join(', ')}）`);
        return;
      }
      uploadToTos(file).catch(() => {
        // 错误已在 uploadToTos 中处理
      });
      // 清空 input 允许重新选择
      e.target.value = '';
    },
    [uploadToTos]
  );

  // 上传封面图片到 TOS
  const handleCoverSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);
      const file = selectedFiles[0];
      if (!file) return;
      // 校验图片类型
      if (!file.type.startsWith('image/')) {
        alert('请选择图片文件（PNG / JPG）');
        e.target.value = '';
        return;
      }
      // 校验大小（5MB）
      if (file.size > 5 * 1024 * 1024) {
        alert('封面图片不能超过 5MB');
        e.target.value = '';
        return;
      }
      setCoverUploading(true);
      try {
        // 1. 获取预签名上传 URL（upload_type=cover，传 file_size 用于去重）
        const presignRes = await api.post<{
          success: boolean;
          exists?: boolean;
          upload_url?: string;
          key: string;
          public_url?: string;
          message?: string;
        }>('/resources/air-upload.php', {
          filename: file.name,
          content_type: file.type || 'image/png',
          upload_type: 'cover',
          file_size: file.size,
        });
        if (!presignRes.success) {
          throw new Error('获取封面上传地址失败');
        }

        // 2. 如果已存在，跳过 PUT 直接复用
        if (presignRes.exists) {
          console.log('[TOS Cover Dedup] 封面已存在，跳过上传:', presignRes.key, presignRes.message);
          const publicUrl = presignRes.public_url || '';
          if (publicUrl) {
            updateForm('coverUrl', publicUrl);
          } else {
            throw new Error('未返回封面 URL');
          }
          return;
        }

        if (!presignRes.upload_url) {
          throw new Error('未返回封面上传地址');
        }

        // 3. PUT 上传到 TOS
        // 注意：不显式设置 Content-Type，避免触发 CORS 预检请求
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', presignRes.upload_url!);
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              const body = xhr.responseText || '';
              console.error('[TOS Cover Upload Error]', {
                status: xhr.status,
                response: body,
                key: presignRes.key,
              });
              let detail = '';
              try {
                const j = JSON.parse(body);
                detail = j.Code ? `${j.Code}: ${j.Message || ''}` : (j.Message || body.slice(0, 200));
              } catch {
                detail = body.slice(0, 200);
              }
              reject(new Error(`封面上传失败 HTTP ${xhr.status} ${detail}`));
            }
          };
          xhr.onerror = () => {
            console.error('[TOS Cover Network Error]', { status: xhr.status, key: presignRes.key });
            reject(new Error('网络/CORS 错误，封面上传失败（请检查 TOS CORS 配置）'));
          };
          xhr.send(file);
        });
        // 4. 将公共 URL 填入 coverUrl
        const publicUrl = presignRes.public_url || '';
        if (publicUrl) {
          updateForm('coverUrl', publicUrl);
        } else {
          throw new Error('未返回封面 URL');
        }
      } catch (err) {
        if (err instanceof ApiError) alert(err.message);
        else if (err instanceof Error) alert(err.message);
        else alert('封面上传失败');
      } finally {
        setCoverUploading(false);
        e.target.value = '';
      }
    },
    [updateForm]
  );

  const removeFile = useCallback((name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  }, []);

  // 步骤校验
  const step1BlockReasons: string[] = [];
  if (form.name.trim().length < 3) step1BlockReasons.push('资源名称至少 3 个字符');
  if (!form.summary.trim()) step1BlockReasons.push('请填写一句话简介');
  if (!form.description.trim()) step1BlockReasons.push('请填写详细描述');
  if (!form.type) step1BlockReasons.push('请选择资源类型');
  const canProceedStep1 = step1BlockReasons.length === 0;

  // 步骤 2：如果 Air 源启用，必须至少有一个上传成功的文件
  const airFileUploaded = files.some((f) => f.status === 'done' && f.key);
  const step2BlockReasons: string[] = [];
  if (form.sources.air.enabled && !airFileUploaded) step2BlockReasons.push('Air 源已启用但未上传文件（或上传失败）');
  const canProceedStep2 = step2BlockReasons.length === 0;

  // 收集提交未通过的原因（用于按钮禁用时的提示）
  const submitBlockReasons: string[] = [];
  if (!form.versionNumber.trim()) submitBlockReasons.push('版本号未填');
  if (form.loaders.length === 0) submitBlockReasons.push('至少选择一个加载器');
  if (form.gameVersions.length === 0) submitBlockReasons.push('至少选择一个游戏版本');
  const anySourceEnabled =
    form.sources.modrinth.enabled ||
    form.sources.curseforge.enabled ||
    form.sources.github.enabled ||
    form.sources.air.enabled;
  if (!anySourceEnabled) submitBlockReasons.push('至少启用一个下载源');
  if (form.sources.modrinth.enabled && !form.sources.modrinth.url.trim()) submitBlockReasons.push('Modrinth 链接未填');
  if (form.sources.curseforge.enabled && !form.sources.curseforge.url.trim()) submitBlockReasons.push('CurseForge 链接未填');
  if (form.sources.github.enabled && !form.sources.github.url.trim()) submitBlockReasons.push('GitHub 链接未填');
  if (form.sources.air.enabled && !airFileUploaded) submitBlockReasons.push('Air 源未上传文件（或上传失败）');
  const canSubmit = submitBlockReasons.length === 0;

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      console.log('[Submit] 开始提交', { canSubmit, form, files });
      if (!canSubmit) {
        console.warn('[Submit] canSubmit=false, 阻止提交', submitBlockReasons);
        return;
      }
      setSubmitting(true);
      setSubmitError(null);
      try {
        // 构造 files 数组（create.php 期望 version.files[].source_type/source_url/file_path/file_name/file_size）
        const versionFiles: Array<{
          source_type: string;
          source_url?: string;
          file_path?: string;
          file_name?: string;
          file_size?: number;
        }> = [];
        if (form.sources.modrinth.enabled && form.sources.modrinth.url) {
          versionFiles.push({ source_type: 'modrinth', source_url: form.sources.modrinth.url });
        }
        if (form.sources.curseforge.enabled && form.sources.curseforge.url) {
          versionFiles.push({ source_type: 'curseforge', source_url: form.sources.curseforge.url });
        }
        if (form.sources.github.enabled && form.sources.github.url) {
          versionFiles.push({ source_type: 'github', source_url: form.sources.github.url });
        }
        if (form.sources.air.enabled) {
          // 查找第一个上传成功的文件
          const airFile = files.find((f) => f.status === 'done' && f.key);
          if (airFile) {
            versionFiles.push({
              source_type: 'air',
              file_path: airFile.key,
              file_name: airFile.name,
              file_size: airFile.rawSize,
            });
          }
        }

        // 一次性调用 create.php 创建资源 + 版本（create.php 支持嵌套 version 对象）
        // 字段名严格匹配后端 create.php 期望：
        //   title（不是 name）、cover_image（不是 cover_url）、
        //   version.loaders、version.mc_versions（不是 game_versions）、version.files
        // tags.tag_type 必须为 'ios'，与 ListPage.tsx 筛选时传的 tag_type='ios' 保持一致
        // 否则前端筛选 iOS 适配标签时会查询不到（资源列表筛选使用 tag_type='ios'）
        const createPayload = {
          title: form.name,
          summary: form.summary,
          description: form.description,
          type: form.type,
          tags: form.tags.map((t) => ({ type: 'ios', value: t })),
          cover_image: form.coverUrl || null,
          version: {
            number: form.versionNumber,
            type: form.versionType,
            changelog: form.changelog || null,
            loaders: form.loaders,
            mc_versions: form.gameVersions,
            files: versionFiles,
          },
        };

        const createRes = await api.post<{
          success: boolean;
          resource?: { id?: string; slug?: string; title?: string };
          version?: { id?: string };
        }>('/resources/create.php', createPayload);

        const resourceSlug = createRes.resource?.slug;
        const resourceId = createRes.resource?.id;
        if (!resourceSlug && !resourceId) {
          throw new Error('创建资源失败：未返回标识');
        }

        // 跳转详情页
        const targetSlug = resourceSlug || String(resourceId);
        navigate(`/resources/detail?slug=${encodeURIComponent(targetSlug)}`);
      } catch (err) {
        if (err instanceof ApiError) setSubmitError(err.message);
        else if (err instanceof Error) setSubmitError(err.message);
        else setSubmitError('提交失败，请重试');
      } finally {
        setSubmitting(false);
      }
    },
    [form, canSubmit, navigate, files, submitBlockReasons]
  );

  return (
    <PageContainer>
      {/* 页面头部 */}
      <section
        className="flex flex-col gap-3"
        style={{ paddingTop: 40, paddingBottom: 32 }}
      >
        <div
          className="inline-flex items-center gap-2"
          style={{
            color: 'var(--muted-foreground)',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--accent-blue)',
            }}
          />
          <span>Resources / Upload</span>
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 40,
            lineHeight: 1.1,
            color: 'var(--foreground)',
            letterSpacing: 'var(--tracking-tight)',
            margin: 0,
          }}
        >
          上传资源
        </h1>
        <p style={{ fontSize: 16, color: 'var(--muted-foreground)', margin: 0 }}>
          分享你的资源与社区
        </p>
      </section>

      <div className="upload-grid">
        {/* 左侧表单 */}
        <div className="flex flex-col gap-7">
          {/* 步骤指示器 */}
          <div
            className="flex items-center gap-2 p-5 rounded-lg"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {STEPS.map((s, idx) => (
              <div key={s.key} className="flex items-center gap-2 flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <span
                    className="inline-flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      background:
                        step > s.key
                          ? 'var(--color-success)'
                          : step === s.key
                          ? 'var(--accent-blue)'
                          : 'var(--muted)',
                      color: 'var(--color-white)',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {step > s.key ? <Check size={14} /> : s.key}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span
                      className="text-sm font-semibold truncate"
                      style={{
                        color: step >= s.key ? 'var(--foreground)' : 'var(--muted-foreground)',
                      }}
                    >
                      {s.label}
                    </span>
                    <span
                      className="text-xs truncate"
                      style={{ color: 'var(--muted-foreground)' }}
                    >
                      {s.desc}
                    </span>
                  </div>
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    style={{
                      width: 24,
                      height: 2,
                      background: 'var(--border)',
                      borderRadius: 1,
                      flexShrink: 0,
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* 步骤 1：基本信息 */}
          <FormSection
            icon={<FileText size={20} />}
            title="基本信息"
            subtitle="填写资源名称、描述与分类"
            stepBadge="步骤 1 / 3"
            active={step === 1}
          >
            <div className="form-group">
              <label className="form-label">
                资源名称<span className="req">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
                placeholder="如 Fabulously Optimized for iOS"
                className="form-input"
              />
              <span className="form-hint">3-80 个字符</span>
            </div>

            <div className="form-group">
              <label className="form-label">
                简短描述<span className="req">*</span>
              </label>
              <input
                type="text"
                value={form.summary}
                onChange={(e) => updateForm('summary', e.target.value)}
                placeholder="一句话描述你的资源"
                className="form-input"
              />
              <span className="form-hint">显示在资源列表中</span>
            </div>

            <div className="form-group">
              <label className="form-label">
                详细描述<span className="req">*</span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
                rows={6}
                placeholder="支持 Markdown 格式，详细描述你的资源特性、使用方法等"
                className="form-textarea"
              />
              <span className="form-hint">支持 Markdown 格式</span>
            </div>

            <div className="form-group">
              <label className="form-label">
                资源分类<span className="req">*</span>
              </label>
              <span className="form-hint" style={{ marginBottom: 8 }}>
                选择资源所属分类
              </span>
              <div className="cat-grid">
                {RESOURCE_TYPES.map((t) => {
                  const Icon = t.icon;
                  const selected = form.type === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => updateForm('type', t.key)}
                      className="flex flex-col gap-1 p-3 rounded-lg text-left transition-all"
                      style={{
                        background: selected ? 'var(--accent-blue-soft)' : 'var(--background)',
                        border: `1px solid ${selected ? 'var(--accent-blue)' : 'var(--border)'}`,
                        cursor: 'pointer',
                      }}
                    >
                      <span
                        className="inline-flex items-center justify-center"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 'var(--radius-sm)',
                          background: selected ? 'var(--accent-blue)' : 'var(--muted)',
                          color: selected ? 'var(--accent-blue-foreground)' : 'var(--accent-blue)',
                        }}
                      >
                        <Icon size={16} />
                      </span>
                      <span
                        className="text-sm font-semibold"
                        style={{ color: 'var(--foreground)' }}
                      >
                        {t.label}
                      </span>
                      <span
                        className="text-xs"
                        style={{ color: 'var(--muted-foreground)' }}
                      >
                        {t.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">标签</label>
              <span className="form-hint" style={{ marginBottom: 8 }}>
                为资源添加标签，方便用户搜索
              </span>
              <div className="flex flex-wrap gap-1.5">
                {IOS_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleArrayValue('tags', tag)}
                    className={`badge ${form.tags.includes(tag) ? 'tag-active' : 'badge-outline'}`}
                    style={{
                      cursor: 'pointer',
                      border: '1px solid var(--border-strong)',
                      padding: '4px 10px',
                      fontSize: 12,
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">封面图片</label>
              <span className="form-hint" style={{ marginBottom: 8 }}>
                点击下方区域上传图片，或直接输入图片 URL（建议尺寸 1280×720，支持 PNG/JPG）
              </span>
              <input
                type="url"
                value={form.coverUrl}
                onChange={(e) => updateForm('coverUrl', e.target.value)}
                placeholder="https://example.com/cover.png"
                className="form-input"
                style={{ marginBottom: 12 }}
              />
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setCoverDragOver(true);
                }}
                onDragLeave={() => setCoverDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setCoverDragOver(false);
                  const droppedFiles = Array.from(e.dataTransfer.files);
                  const file = droppedFiles[0];
                  if (!file) return;
                  if (!file.type.startsWith('image/')) {
                    alert('请选择图片文件（PNG / JPG）');
                    return;
                  }
                  if (file.size > 5 * 1024 * 1024) {
                    alert('封面图片不能超过 5MB');
                    return;
                  }
                  // 复用 handleCoverSelect 的上传逻辑
                  const dt = new DataTransfer();
                  dt.items.add(file);
                  const evt = { target: { files: dt.files, value: '' } } as unknown as React.ChangeEvent<HTMLInputElement>;
                  handleCoverSelect(evt);
                }}
                onClick={() => document.getElementById('cover-input')?.click()}
                className="flex flex-col items-center justify-center gap-2 py-6 rounded-lg cursor-pointer"
                style={{
                  border: `2px dashed ${coverDragOver ? 'var(--accent-blue)' : 'var(--border-strong)'}`,
                  background: 'var(--background)',
                  color: 'var(--muted-foreground)',
                  textAlign: 'center',
                  position: 'relative',
                }}
              >
                {coverUploading ? (
                  <>
                    <Loader2 size={22} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
                    <span className="text-sm" style={{ color: 'var(--foreground)' }}>上传中...</span>
                  </>
                ) : (
                  <>
                    <ImageIcon size={22} />
                    <span className="text-sm">点击或拖拽上传封面图片</span>
                    <span className="text-xs">PNG / JPG · 最大 5MB · 推荐 16:9</span>
                    {form.coverUrl && (
                      <span className="text-xs mt-1" style={{ color: 'var(--color-success)' }}>
                        ✓ 已上传
                      </span>
                    )}
                  </>
                )}
                <input
                  id="cover-input"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleCoverSelect}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            {step === 1 && (
              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  onClick={() => {
                    if (!canProceedStep1) {
                      alert('请先完善基本信息：\n\n• ' + step1BlockReasons.join('\n• '));
                      return;
                    }
                    setStep(2);
                  }}
                  className="btn-blue"
                >
                  下一步
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </FormSection>

          {/* 步骤 2：文件上传 */}
          <FormSection
            icon={<UploadIcon size={20} />}
            title="文件上传"
            subtitle="上传资源文件"
            stepBadge="步骤 2 / 3"
            active={step === 2}
          >
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              className="flex flex-col items-center justify-center gap-3 py-10 rounded-lg cursor-pointer"
              style={{
                border: `2px dashed ${dragOver ? 'var(--accent-blue)' : 'var(--border-strong)'}`,
                background: 'var(--background)',
                color: 'var(--muted-foreground)',
                textAlign: 'center',
              }}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <UploadIcon size={24} style={{ color: 'var(--accent-blue)' }} />
              <span className="text-sm" style={{ color: 'var(--foreground)', fontWeight: 500 }}>
                点击或拖拽文件到此处上传
              </span>
              <span className="text-xs">
                支持格式：{ALLOWED_EXTENSIONS.join(', ')} · 单文件最大 1GB
              </span>
              <input
                id="file-input"
                type="file"
                multiple
                accept={ALLOWED_EXTENSIONS.join(',')}
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>

            {/* 提示 */}
            <div
              className="flex items-start gap-2 mt-4 p-3 rounded-lg text-sm"
              style={{
                background: form.sources.air.enabled
                  ? 'rgba(34, 197, 94, 0.08)'
                  : 'var(--accent-blue-soft)',
                color: form.sources.air.enabled ? 'var(--color-success)' : 'var(--accent-blue)',
              }}
            >
              <Info size={16} className="flex-shrink-0 mt-0.5" />
              <span>
                {form.sources.air.enabled
                  ? 'Air 官网下载源已启用：请在此处上传资源文件，文件将直接上传到 Air 官方对象存储。当前为限免测试阶段，上传和下载均不消耗积分，后续可能会引入积分消耗机制。'
                  : '如需使用 Air 官网下载源（直传到 Air 官方对象存储），请先到步骤 3 勾选「Air 官网」下载源，然后返回此处上传文件。'}
              </span>
            </div>

            {/* 已上传文件列表 */}
            {files.length > 0 && (
              <div className="flex flex-col gap-2 mt-4">
                {files.map((f) => (
                  <div
                    key={f.name}
                    className="flex items-center gap-3 p-3 rounded-lg"
                    style={{
                      background: 'var(--background)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <span
                      className="inline-flex items-center justify-center flex-shrink-0"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--accent-blue-soft)',
                        color: 'var(--accent-blue)',
                      }}
                    >
                      <Package size={18} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-sm truncate"
                        style={{ color: 'var(--foreground)', fontWeight: 500 }}
                      >
                        {f.name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        <span>{f.size}</span>
                        <span
                          className="inline-flex items-center gap-1"
                          style={{
                            color: f.status === 'done'
                              ? 'var(--color-success)'
                              : f.status === 'error'
                              ? 'var(--destructive)'
                              : 'var(--accent-blue)',
                          }}
                        >
                          {f.status === 'done' ? (
                            <Check size={12} />
                          ) : f.status === 'error' ? (
                            <X size={12} />
                          ) : (
                            <Clock size={12} className="animate-spin" />
                          )}
                          {f.status === 'done'
                            ? '上传完成'
                            : f.status === 'error'
                            ? f.errorMsg || '上传失败'
                            : `上传中 ${f.progress}%`}
                        </span>
                      </div>
                      <div
                        className="mt-1.5 rounded"
                        style={{ background: 'var(--muted)', height: 4, overflow: 'hidden' }}
                      >
                        <div
                          style={{
                            width: `${f.status === 'error' ? 100 : f.progress}%`,
                            height: '100%',
                            background: f.status === 'done'
                              ? 'var(--color-success)'
                              : f.status === 'error'
                              ? 'var(--destructive)'
                              : 'var(--accent-blue)',
                            transition: 'width 0.2s ease',
                          }}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(f.name)}
                      title="移除"
                      className="p-1.5 rounded flex-shrink-0"
                      style={{ color: 'var(--muted-foreground)', cursor: 'pointer' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="flex justify-between mt-4">
                <button type="button" onClick={() => setStep(1)} className="btn-outline">
                  <ArrowLeft size={14} />
                  上一步
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!canProceedStep2) {
                      alert('无法进入下一步：\n\n• ' + step2BlockReasons.join('\n• '));
                      return;
                    }
                    setStep(3);
                  }}
                  className="btn-blue"
                >
                  下一步
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </FormSection>

          {/* 步骤 3：版本信息 */}
          <FormSection
            icon={<Clock size={20} />}
            title="版本信息"
            subtitle="版本号、兼容性与更新日志"
            stepBadge="步骤 3 / 3"
            active={step === 3}
          >
            <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="form-group">
                <label className="form-label">
                  版本号<span className="req">*</span>
                </label>
                <input
                  type="text"
                  value={form.versionNumber}
                  onChange={(e) => updateForm('versionNumber', e.target.value)}
                  placeholder="如 1.0.0"
                  className="form-input"
                />
                <span className="form-hint">如 1.0.0</span>
              </div>
              <div className="form-group">
                <label className="form-label">版本类型</label>
                <div className="seg-group">
                  {([
                    { key: 'release', label: '正式版' },
                    { key: 'beta', label: 'Beta' },
                    { key: 'alpha', label: '快照' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => updateForm('versionType', opt.key)}
                      className={`seg ${form.versionType === opt.key ? 'selected' : ''}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                支持加载器<span className="req">*</span>
              </label>
              <span className="form-hint" style={{ marginBottom: 8 }}>
                选择该版本支持的加载器（可多选）
              </span>
              <div className="flex flex-wrap gap-1.5">
                {LOADERS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => toggleArrayValue('loaders', l)}
                    className="badge inline-flex items-center gap-1"
                    style={{
                      cursor: 'pointer',
                      background: form.loaders.includes(l) ? 'var(--accent-blue)' : 'transparent',
                      color: form.loaders.includes(l) ? 'var(--accent-blue-foreground)' : 'var(--foreground)',
                      border: '1px solid var(--border-strong)',
                      padding: '5px 12px',
                      fontSize: 12,
                    }}
                  >
                    {form.loaders.includes(l) && <Check size={12} />}
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                支持 MC 版本<span className="req">*</span>
              </label>
              <span className="form-hint" style={{ marginBottom: 8 }}>
                选择该版本兼容的 Minecraft 版本（可多选，按发布时间倒序）
              </span>
              <div
                className="flex flex-col gap-3 overflow-y-auto pr-1"
                style={{ maxHeight: 280 }}
              >
                {MC_VERSION_GROUPS.map((group) => (
                  <div key={group.label} className="flex flex-col gap-1.5">
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--muted-foreground)',
                        fontFamily: 'var(--font-mono)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {group.label}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {group.versions.map((item) => (
                        <button
                          key={item.v}
                          type="button"
                          onClick={() => toggleArrayValue('gameVersions', item.v)}
                          className="badge inline-flex items-center gap-1"
                          style={{
                            cursor: 'pointer',
                            background: form.gameVersions.includes(item.v) ? 'var(--accent-blue)' : 'transparent',
                            color: form.gameVersions.includes(item.v) ? 'var(--accent-blue-foreground)' : 'var(--foreground)',
                            border: '1px solid var(--border-strong)',
                            padding: '5px 12px',
                            fontSize: 12,
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          {form.gameVersions.includes(item.v) && <Check size={12} />}
                          {item.v}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">更新日志</label>
              <textarea
                value={form.changelog}
                onChange={(e) => updateForm('changelog', e.target.value)}
                rows={5}
                placeholder="描述这个版本的更新内容，支持 Markdown"
                className="form-textarea"
              />
              <span className="form-hint">描述这个版本的更新内容，支持 Markdown</span>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">下载源</label>
              <span className="form-hint" style={{ marginBottom: 8 }}>
                选择文件提供的下载源（可多选）
              </span>
              <div className="source-pick">
                <SourcePickerCard
                  label="Modrinth"
                  color="var(--color-success)"
                  badgeClass="source-modrinth"
                  enabled={form.sources.modrinth.enabled}
                  onToggle={() => toggleSource('modrinth')}
                  url={form.sources.modrinth.url}
                  onUrlChange={(u) => updateSourceUrl('modrinth', u)}
                />
                <SourcePickerCard
                  label="CurseForge"
                  color="var(--color-warning)"
                  badgeClass="source-curseforge"
                  enabled={form.sources.curseforge.enabled}
                  onToggle={() => toggleSource('curseforge')}
                  url={form.sources.curseforge.url}
                  onUrlChange={(u) => updateSourceUrl('curseforge', u)}
                />
                <SourcePickerCard
                  label="GitHub"
                  color="var(--color-neutral)"
                  badgeClass="source-official"
                  enabled={form.sources.github.enabled}
                  onToggle={() => toggleSource('github')}
                  url={form.sources.github.url}
                  onUrlChange={(u) => updateSourceUrl('github', u)}
                />
                {/* TODO: 对象存储配置后启用 */}
                <SourcePickerCard
                  label="Air 官网"
                  color="var(--accent-blue)"
                  badgeClass="source-bmclapi"
                  enabled={form.sources.air.enabled}
                  onToggle={() => toggleSource('air')}
                  airStorage
                />
              </div>
            </div>

            {submitError && (
              <div
                className="mt-4 flex items-center gap-2 p-3 rounded-lg text-sm"
                style={{
                  background: 'rgba(220, 38, 38, 0.08)',
                  border: '1px solid rgba(220, 38, 38, 0.2)',
                  color: 'var(--destructive)',
                }}
              >
                <AlertTriangle size={16} />
                <span>{submitError}</span>
              </div>
            )}

            {step === 3 && (
              <div className="flex justify-between mt-4">
                <button type="button" onClick={() => setStep(2)} className="btn-outline">
                  <ArrowLeft size={14} />
                  上一步
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    if (submitting) return;
                    if (!canSubmit) {
                      alert('无法提交，请检查以下问题：\n\n• ' + submitBlockReasons.join('\n• '));
                      return;
                    }
                    handleSubmit(e as unknown as FormEvent);
                  }}
                  className="btn-blue"
                >
                  {submitting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  提交
                </button>
              </div>
            )}
          </FormSection>

          {/* 底部提示 */}
          <div
            className="flex items-center justify-between gap-3 flex-wrap p-4 rounded-lg"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
            }}
          >
            <span
              className="inline-flex items-center gap-2 text-xs"
              style={{ color: 'var(--muted-foreground)' }}
            >
              <AlertTriangle size={14} style={{ color: 'var(--color-warning)' }} />
              提交后立即发布，资源将在资源中心展示
            </span>
            <div className="flex gap-2">
              <Link to="/resources" className="btn-outline btn-sm">
                取消
              </Link>
            </div>
          </div>
        </div>

        {/* 右侧指南 */}
        <aside className="aside-sticky flex flex-col gap-5">
          {/* 上传须知 */}
          <GuideCard title="上传须知" icon={<AlertTriangle size={18} />}>
            <ul className="flex flex-col gap-2 text-sm" style={{ color: 'var(--foreground)' }}>
              <li className="flex gap-2">
                <span style={{ color: 'var(--accent-blue)', flexShrink: 0 }}>·</span>
                <span>确保你<strong>有权上传</strong>该资源，尊重原作者版权</span>
              </li>
              <li className="flex gap-2">
                <span style={{ color: 'var(--accent-blue)', flexShrink: 0 }}>·</span>
                <span>资源<strong>不得包含恶意代码</strong>或破坏性脚本</span>
              </li>
              <li className="flex gap-2">
                <span style={{ color: 'var(--color-warning)', flexShrink: 0 }}>·</span>
                <span>iOS 移植资源<strong>需注明原作者</strong>及来源链接</span>
              </li>
              <li className="flex gap-2">
                <span style={{ color: 'var(--accent-blue)', flexShrink: 0 }}>·</span>
                <span>上传后立即可见</span>
              </li>
              <li className="flex gap-2">
                <span style={{ color: 'var(--accent-blue)', flexShrink: 0 }}>·</span>
                <span>资源提交后立即在<strong>资源中心</strong>展示</span>
              </li>
            </ul>
          </GuideCard>

          {/* 支持的格式 */}
          <GuideCard title="支持的格式" icon={<FileText size={18} />}>
            <div className="flex flex-col gap-1.5 text-sm">
              {[
                { type: '整合包', ext: '.mrpack .airpack' },
                { type: 'Mod', ext: '.jar' },
                { type: '光影包', ext: '.zip' },
                { type: '渲染器', ext: '.zip' },
                { type: '软件', ext: '.ipa .tipa' },
                { type: '其他', ext: '.zip .mcpack' },
              ].map((row) => (
                <div
                  key={row.type}
                  className="flex items-center justify-between gap-2"
                >
                  <span style={{ color: 'var(--muted-foreground)' }}>{row.type}</span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      color: 'var(--foreground)',
                    }}
                  >
                    {row.ext}
                  </span>
                </div>
              ))}
            </div>
          </GuideCard>

          {/* AirPack 格式说明 */}
          <GuideCard title="AirPack 格式说明" icon={<Package size={18} />}>
            <ul className="flex flex-col gap-2 text-sm" style={{ color: 'var(--foreground)' }}>
              <li className="flex gap-2">
                <span style={{ color: 'var(--accent-blue)', flexShrink: 0 }}>·</span>
                <span>AirPack 是 <strong>Air 启动器独有</strong>格式</span>
              </li>
              <li className="flex gap-2">
                <span style={{ color: 'var(--accent-blue)', flexShrink: 0 }}>·</span>
                <span>包含完整<strong>游戏目录</strong> + 偏好设置 + 按键布局</span>
              </li>
              <li className="flex gap-2">
                <span style={{ color: 'var(--accent-blue)', flexShrink: 0 }}>·</span>
                <span>文件扩展名：<strong>.airpack</strong></span>
              </li>
              <li className="flex gap-2">
                <span style={{ color: 'var(--accent-blue)', flexShrink: 0 }}>·</span>
                <span>仅支持在 <strong>Air 启动器</strong>中导入</span>
              </li>
            </ul>
            <div
              className="mt-3 flex gap-2 p-2.5 rounded text-xs"
              style={{
                background: 'var(--muted)',
                color: 'var(--muted-foreground)',
              }}
            >
              <Info size={14} className="flex-shrink-0 mt-0.5" />
              <span>AirPack 适合分享完整游戏环境，体积通常大于 .mrpack</span>
            </div>
          </GuideCard>
        </aside>
      </div>

      {/* 隐藏占位以消除未使用警告 */}
      <span style={{ display: 'none' }} aria-hidden>
        <Download size={0} />
        <Zap size={0} />
        <Sun size={0} />
        <Monitor size={0} />
        <AppWindow size={0} />
        <FileIcon size={0} />
      </span>
    </PageContainer>
  );
}

/* ============ 子组件 ============ */

function FormSection({
  icon,
  title,
  subtitle,
  stepBadge,
  active,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  stepBadge: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-lg p-6"
      style={{
        background: 'var(--card)',
        border: `1px solid ${active ? 'var(--accent-blue)' : 'var(--border)'}`,
        boxShadow: 'var(--shadow-sm)',
        opacity: active ? 1 : 0.7,
      }}
    >
      <div
        className="flex items-center gap-3 mb-5 pb-4"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <span
          className="inline-flex items-center justify-center flex-shrink-0"
          style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-sm)',
            background: 'var(--accent-blue-soft)',
            color: 'var(--accent-blue)',
          }}
        >
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--foreground)' }}>
            {title}
          </div>
          <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {subtitle}
          </div>
        </div>
        <span
          className="text-xs px-2 py-1 rounded"
          style={{
            background: 'var(--muted)',
            color: 'var(--muted-foreground)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {stepBadge}
        </span>
      </div>
      <div>{children}</div>
    </section>
  );
}

function GuideCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg p-5"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <h3
        className="mb-3 inline-flex items-center gap-2"
        style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)' }}
      >
        <span style={{ color: 'var(--accent-blue)' }}>{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

function SourcePickerCard({
  label,
  color,
  badgeClass,
  enabled,
  onToggle,
  url,
  onUrlChange,
  airStorage,
}: {
  label: string;
  color: string;
  badgeClass: string;
  enabled: boolean;
  onToggle: () => void;
  url?: string;
  onUrlChange?: (url: string) => void;
  airStorage?: boolean;
}) {
  return (
    <div className={`sp-card ${enabled ? 'selected' : ''}`}>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={onToggle}
          style={{ width: 16, height: 16, accentColor: 'var(--accent-blue)' }}
        />
        <span className={`source-label ${badgeClass}`} style={{ fontSize: 11 }}>
          {label}
        </span>
      </label>
      {enabled && !airStorage && onUrlChange && (
        <input
          type="url"
          value={url || ''}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder={`${label} URL`}
          className="form-input mt-2"
          style={{ fontSize: 12, padding: '6px 10px' }}
          required
        />
      )}
      {/* TODO: 对象存储配置后启用 */}
      {enabled && airStorage && (
        <div
          className="mt-2 p-2.5 rounded text-xs"
          style={{
            background: 'rgba(34, 197, 94, 0.08)',
            color: 'var(--color-success)',
            border: '1px solid rgba(34, 197, 94, 0.2)',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 2 }}>限免测试中</div>
          <div style={{ opacity: 0.9 }}>
            当前 Air 官网下载源处于限免测试阶段，上传/下载暂不消耗积分，后续可能引入积分机制。请到「步骤 2」上传资源文件。
          </div>
        </div>
      )}
    </div>
  );
}
