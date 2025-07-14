'use client';

import { Platform, PlatformSettings } from '@/types/sidebar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { ConditionalSection } from './SmartSidebar';

interface PlatformControlsProps {
  platforms: Record<string, Platform>;
  selectedPlatforms: string[];
  platformSettings: Record<string, PlatformSettings>;
  onUpdate: (platform: string, settings: Partial<PlatformSettings>) => void;
  currentMode: 'global' | 'platform' | 'multi-select';
  generatedContentLength?: number;
}

export function PlatformControls({ 
  platforms, 
  selectedPlatforms, 
  platformSettings, 
  onUpdate, 
  currentMode,
  generatedContentLength = 0
}: PlatformControlsProps) {
  if (selectedPlatforms.length === 0) {
    return null;
  }

  // 单平台模式
  if (currentMode === 'platform' && selectedPlatforms.length === 1) {
    const platformId = selectedPlatforms[0];
    if (!platformId) return null;
    
    const platform = platforms[platformId];
    const settings = platformSettings[platformId] || {};
    
    if (!platform) return null;

    const maxChars = platform.constraints?.maxCharacters;
    const isOverLimit = maxChars && generatedContentLength > maxChars;

    return (
      <ConditionalSection when="platform" currentMode={currentMode}>
        {/* 平台特定设置 */}
        <div className="bg-background-main rounded-lg border border-border-default/20 overflow-hidden">
          <div className="bg-background-ivory-medium px-6 py-4 border-b border-border-default/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center u-gap-s">
                <div className={`w-3 h-3 rounded-full ${platform.color}`}></div>
                <h3 className="font-medium text-text-main">{platform.fullName}</h3>
              </div>
              <div className="text-xs text-text-faded bg-green-100 text-green-700 px-2 py-1 rounded">
                平台特定
              </div>
            </div>
          </div>

          <div className="p-6 u-gap-m flex flex-col">
            {/* 字数限制显示 */}
            {maxChars && (
              <div>
                <div className="flex items-center justify-between u-mb-text">
                  <span className="text-sm font-medium text-text-main">字数限制</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    isOverLimit 
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {generatedContentLength}/{maxChars}
                  </span>
                </div>
                {isOverLimit && (
                  <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                    ⚠️ 内容超出 {platform.name} 平台字数限制
                  </div>
                )}
              </div>
            )}

            {/* 图片处理 */}
            <div>
              <label className="block text-sm font-medium text-text-main u-mb-text">
                图片处理
              </label>
              <Select 
                value={settings.imageCompression || 'medium'} 
                onValueChange={(value: 'high' | 'medium' | 'low') => 
                  onUpdate(platformId, { imageCompression: value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">高压缩 (适合移动端)</SelectItem>
                  <SelectItem value="medium">中等压缩 (平衡质量)</SelectItem>
                  <SelectItem value="low">低压缩 (保持质量)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 链接处理 */}
            <div>
              <label className="block text-sm font-medium text-text-main u-mb-text">
                链接处理
              </label>
              <Select 
                value={settings.linkHandling || 'preserve'} 
                onValueChange={(value: 'preserve' | 'convert-to-text' | 'footnote') => 
                  onUpdate(platformId, { linkHandling: value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preserve">保持链接</SelectItem>
                  <SelectItem value="convert-to-text">转为文本</SelectItem>
                  <SelectItem value="footnote">脚注引用</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 平台约束信息 */}
            {platform.constraints && (
              <div className="bg-background-ivory-medium p-3 rounded text-xs text-text-faded">
                <div className="font-medium u-mb-text">平台要求：</div>
                {platform.constraints.supportedFormats && (
                  <div>
                    支持格式: {platform.constraints.supportedFormats.join(', ')}
                  </div>
                )}
                {platform.constraints.imageRequirements && (
                  <div>
                    图片要求: {platform.constraints.imageRequirements.maxSize}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 平台预览选项 */}
        <div className="bg-background-main rounded-lg border border-border-default/20 overflow-hidden">
          <div className="bg-background-ivory-medium px-6 py-4 border-b border-border-default/20">
            <h3 className="font-medium text-text-main">预览选项</h3>
          </div>

          <div className="p-6 u-gap-s flex flex-col">
            <button type="button" className="w-full text-left p-3 text-sm text-text-main hover:bg-background-ivory-medium rounded-md transition-colors">
              🔄 重新生成此平台内容
            </button>
            <button type="button" className="w-full text-left p-3 text-sm text-text-main hover:bg-background-ivory-medium rounded-md transition-colors">
              ✂️ 智能裁剪到字数限制
            </button>
            <button type="button" className="w-full text-left p-3 text-sm text-text-main hover:bg-background-ivory-medium rounded-md transition-colors">
              🎨 应用平台模板
            </button>
            <button type="button" className="w-full text-left p-3 text-sm text-text-main hover:bg-background-ivory-medium rounded-md transition-colors">
              📤 导出到 {platform.name}
            </button>
          </div>
        </div>
      </ConditionalSection>
    );
  }

  // 多选模式
  if (currentMode === 'multi-select' && selectedPlatforms.length > 1) {
    return (
      <ConditionalSection when="multi-select" currentMode={currentMode}>
        {/* 批量操作 */}
        <div className="bg-background-main rounded-lg border border-border-default/20 overflow-hidden">
          <div className="bg-background-ivory-medium px-6 py-4 border-b border-border-default/20">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-text-main">批量操作</h3>
              <div className="text-xs text-text-faded bg-orange-100 text-orange-700 px-2 py-1 rounded">
                {selectedPlatforms.length} 个平台
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* 选中的平台列表 */}
            <div className="u-mb-text">
              <div className="text-sm font-medium text-text-main u-mb-text">选中平台：</div>
              <div className="flex flex-wrap u-gap-xs">
                {selectedPlatforms.map(platformId => {
                  const platform = platforms[platformId];
                  if (!platform) return null;
                  return (
                    <div key={platformId} className="flex items-center u-gap-xs bg-background-ivory-medium px-2 py-1 rounded text-xs">
                      <div className={`w-2 h-2 rounded-full ${platform.color}`}></div>
                      <span>{platform.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 批量操作按钮 */}
            <div className="u-gap-s flex flex-col">
              <button type="button" className="w-full text-left p-3 text-sm text-text-main hover:bg-background-ivory-medium rounded-md transition-colors">
                🔄 批量重新生成内容
              </button>
              <button type="button" className="w-full text-left p-3 text-sm text-text-main hover:bg-background-ivory-medium rounded-md transition-colors">
                ⚙️ 批量应用设置
              </button>
              <button type="button" className="w-full text-left p-3 text-sm text-text-main hover:bg-background-ivory-medium rounded-md transition-colors">
                📤 批量导出
              </button>
              <button type="button" className="w-full text-left p-3 text-sm text-text-main hover:bg-background-ivory-medium rounded-md transition-colors">
                🗑️ 批量删除
              </button>
            </div>
          </div>
        </div>

        {/* 共同设置 */}
        <div className="bg-background-main rounded-lg border border-border-default/20 overflow-hidden">
          <div className="bg-background-ivory-medium px-6 py-4 border-b border-border-default/20">
            <h3 className="font-medium text-text-main">共同设置</h3>
          </div>

          <div className="p-6 u-gap-m flex flex-col">
            <div>
              <label className="block text-sm font-medium text-text-main u-mb-text">
                统一图片处理
              </label>
              <Select 
                onValueChange={(value: 'high' | 'medium' | 'low') => {
                  selectedPlatforms.forEach(platformId => {
                    onUpdate(platformId, { imageCompression: value });
                  });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择压缩级别应用到所有平台" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">高压缩</SelectItem>
                  <SelectItem value="medium">中等压缩</SelectItem>
                  <SelectItem value="low">低压缩</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-main u-mb-text">
                统一链接处理
              </label>
              <Select 
                onValueChange={(value: 'preserve' | 'convert-to-text' | 'footnote') => {
                  selectedPlatforms.forEach(platformId => {
                    onUpdate(platformId, { linkHandling: value });
                  });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择链接处理方式应用到所有平台" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preserve">保持链接</SelectItem>
                  <SelectItem value="convert-to-text">转为文本</SelectItem>
                  <SelectItem value="footnote">脚注引用</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </ConditionalSection>
    );
  }

  return null;
}