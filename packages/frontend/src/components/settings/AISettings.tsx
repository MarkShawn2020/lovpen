import React, {useEffect, useState} from 'react';
import {Button} from '../ui/button';
import {FormInput} from '../ui/FormInput';
import {ViteReactSettings} from '../../types';
import {logger} from '../../../../shared/src/logger';
import {
	Bot,
	CheckCircle,
	Code,
	ExternalLink,
	FileText,
	Info,
	Key,
	RefreshCw,
	RotateCcw,
	Save,
	Sparkles,
	Tag,
	User,
	XCircle,
	Zap
} from 'lucide-react';
import {useSettings} from '../../hooks/useSettings';

// import {requestUrl} from "obsidian"; // 移除直接导入，改为动态require

interface AISettingsProps {
	onClose: () => void;
	onSettingsChange?: (settings: Partial<ViteReactSettings>) => void;
	onSaveSettings?: () => void;
}

export const AISettings: React.FC<AISettingsProps> = ({
														  onClose,
														  onSettingsChange,
														  onSaveSettings
													  }) => {
	const {
		settings,
		saveStatus,
		updateSettings,
		saveSettings
	} = useSettings(onSaveSettings, undefined, onSettingsChange);
	const [claudeApiKey, setClaudeApiKey] = useState<string>(settings.authKey || '');
	const [aiPromptTemplate, setAiPromptTemplate] = useState<string>(settings.aiPromptTemplate || '');
	const [isTestingConnection, setIsTestingConnection] = useState(false);
	const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
	const [errorMessage, setErrorMessage] = useState<string>('');

	useEffect(() => {
		setClaudeApiKey(settings.authKey || '');
		setAiPromptTemplate(settings.aiPromptTemplate || '');
	}, [settings.authKey, settings.aiPromptTemplate]);

	const handleApiKeyChange = (value: string) => {
		setClaudeApiKey(value);
		setConnectionStatus('idle');
		setErrorMessage('');
		// 实时更新 Jotai 状态
		updateSettings({authKey: value.trim()});
	};

	const handlePromptTemplateChange = (value: string) => {
		setAiPromptTemplate(value);
		// 实时更新 Jotai 状态
		updateSettings({aiPromptTemplate: value.trim()});
	};

	const testConnection = async () => {
		if (!claudeApiKey.trim()) {
			setErrorMessage('请输入Claude API密钥');
			setConnectionStatus('error');
			return;
		}

		setIsTestingConnection(true);
		setConnectionStatus('idle');
		setErrorMessage('');

		try {
			// 使用Obsidian的requestUrl API来避免CORS问题
			// 通过全局API获取requestUrl
			if (!window.lovpenReactAPI || typeof window.lovpenReactAPI.requestUrl === 'undefined') {
				throw new Error('此功能仅在Obsidian环境中可用');
			}
			const requestUrl = window.lovpenReactAPI.requestUrl;
			const response = await requestUrl({
				url: 'https://api.anthropic.com/v1/messages',
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': claudeApiKey.trim(),
					'anthropic-version': '2023-06-01'
				},
				body: JSON.stringify({
					model: 'claude-3-sonnet-20240229',
					max_tokens: 10,
					messages: [
						{
							role: 'user',
							content: '测试连接'
						}
					]
				})
			});

			if (response.status === 200) {
				setConnectionStatus('success');
				logger.info('Claude API连接测试成功');
			} else {
				throw new Error(`API调用失败: ${response.status}`);
			}
		} catch (error) {
			setConnectionStatus('error');
			setErrorMessage(error instanceof Error ? error.message : '连接测试失败');
			logger.error('Claude API连接测试失败:', error);
		} finally {
			setIsTestingConnection(false);
		}
	};

	const handleSave = () => {
		// 使用jotai更新设置
		updateSettings({
			authKey: claudeApiKey.trim(),
			aiPromptTemplate: aiPromptTemplate.trim()
		});
		saveSettings();
		logger.info('AI设置已保存');
		onClose();
	};

	const handleReset = () => {
		if (confirm('确定要清空所有AI设置吗？')) {
			setClaudeApiKey('');
			setAiPromptTemplate('');
			setConnectionStatus('idle');
			setErrorMessage('');
		}
	};

	const getDefaultPromptTemplate = () => {
		return `请分析以下文章内容，为其生成合适的元数据信息。请返回JSON格式的结果：

文章内容：
{{content}}

{{#if filename}}
文件名：{{filename}}
{{/if}}

{{#if personalInfo.name}}
作者信息：{{personalInfo.name}}
{{/if}}

{{#if personalInfo.bio}}
作者简介：{{personalInfo.bio}}
{{/if}}

可用的元信息变量（frontmatter中的字段）：
{{#each frontmatter}}
- {{@key}}: {{this}}
{{/each}}

请基于以上信息分析文章内容并生成：
1. articleTitle: 基于内容的更好标题（如果原标题合适可保持）
2. articleSubtitle: 合适的副标题或摘要
3. episodeNum: 如果是系列文章，推测期数（格式：第 X 期）
4. seriesName: 如果是系列文章，推测系列名称
5. tags: 3-5个相关标签数组
6. author: 基于内容推测的作者名（如果无法推测留空）
7. publishDate: 建议的发布日期（YYYY-MM-DD格式，通常是今天）

请确保返回格式为纯JSON，不要包含其他文字：
{
  "articleTitle": "...",
  "articleSubtitle": "...",
  "episodeNum": "...",
  "seriesName": "...",
  "tags": ["标签1", "标签2", "标签3"],
  "author": "...",
  "publishDate": "..."
}`;
	};

	const handleUseDefaultTemplate = () => {
		setAiPromptTemplate(getDefaultPromptTemplate());
	};

	return (
		<div className="space-y-6">
			{/* 头部说明 */}
			<div className="text-center">
				<h3 className="text-lg font-semibold text-gray-900 mb-2">AI 智能设置</h3>
				<p className="text-gray-600">配置 Claude AI 集成，解锁智能内容分析功能</p>
			</div>

			{/* AI功能介绍卡片 */}
			<div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
				<div className="flex items-center gap-3 mb-4">
					<div className="p-2 bg-blue-100 rounded-lg">
						<Bot className="h-6 w-6 text-blue-600"/>
					</div>
					<div>
						<h4 className="font-semibold text-gray-900">Claude AI 智能助手</h4>
						<p className="text-sm text-gray-600">强大的AI助手，为您的内容创作提供智能支持</p>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
					<div className="bg-white/60 backdrop-blur-sm border border-blue-200 rounded-lg p-3">
						<div className="flex items-center gap-2 mb-2">
							<Sparkles className="h-4 w-4 text-blue-600"/>
							<h5 className="text-sm font-medium text-gray-800">智能分析</h5>
						</div>
						<p className="text-xs text-gray-600">自动分析文章内容，提取关键信息</p>
					</div>
					<div className="bg-white/60 backdrop-blur-sm border border-purple-200 rounded-lg p-3">
						<div className="flex items-center gap-2 mb-2">
							<FileText className="h-4 w-4 text-purple-600"/>
							<h5 className="text-sm font-medium text-gray-800">内容建议</h5>
						</div>
						<p className="text-xs text-gray-600">智能建议标题、副标题等元数据</p>
					</div>
					<div className="bg-white/60 backdrop-blur-sm border border-indigo-200 rounded-lg p-3">
						<div className="flex items-center gap-2 mb-2">
							<Tag className="h-4 w-4 text-indigo-600"/>
							<h5 className="text-sm font-medium text-gray-800">自动标签</h5>
						</div>
						<p className="text-xs text-gray-600">基于内容主题生成相关标签</p>
					</div>
				</div>
			</div>

			{/* API密钥配置卡片 */}
			<div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
				<div className="flex items-center gap-3 mb-4">
					<div className="p-2 bg-green-100 rounded-lg">
						<Key className="h-5 w-5 text-green-600"/>
					</div>
					<div>
						<h4 className="font-semibold text-gray-900">API 密钥配置</h4>
						<p className="text-sm text-gray-600">安全配置您的 Claude AI API 访问凭证</p>
					</div>
				</div>

				<div className="space-y-4">
					<FormInput
						label="Claude API 密钥"
						value={claudeApiKey}
						onChange={handleApiKeyChange}
						placeholder="sk-ant-api03-..."
						type="password"
						required={true}
						icon={Key}
						className="font-mono text-sm"
					/>

					<div className="flex items-center justify-between">
						<Button
							onClick={testConnection}
							disabled={isTestingConnection || !claudeApiKey.trim()}
							size="sm"
							className="bg-blue-600 hover:bg-blue-700 text-white"
						>
							{isTestingConnection ? (
								<>
									<RefreshCw className="w-4 h-4 mr-2 animate-spin"/>
									测试连接中...
								</>
							) : (
								<>
									<Zap className="w-4 h-4 mr-2"/>
									测试连接
								</>
							)}
						</Button>

						{connectionStatus === 'success' && (
							<div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded-lg">
								<CheckCircle className="w-4 h-4"/>
								<span className="text-sm font-medium">连接成功</span>
							</div>
						)}

						{connectionStatus === 'error' && (
							<div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-lg">
								<XCircle className="w-4 h-4"/>
								<span className="text-sm font-medium">连接失败</span>
							</div>
						)}
					</div>

					{errorMessage && (
						<div className="bg-red-50 border border-red-200 rounded-lg p-3">
							<p className="text-red-600 text-sm flex items-center gap-2">
								<XCircle className="w-4 h-4"/>
								{errorMessage}
							</p>
						</div>
					)}

					{/* API密钥安全说明 */}
					<div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
						<div className="flex items-start gap-2">
							<Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0"/>
							<div className="text-sm text-amber-800">
								<p className="font-medium">安全提醒</p>
								<p className="mt-1">API密钥仅在本地存储，不会上传到任何服务器。请妥善保管您的密钥。</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* 提示词模板配置卡片 */}
			<div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-purple-100 rounded-lg">
							<Code className="h-5 w-5 text-purple-600"/>
						</div>
						<div>
							<h4 className="font-semibold text-gray-900">提示词模板</h4>
							<p className="text-sm text-gray-600">自定义AI分析的指令模板（支持Handlebars语法）</p>
						</div>
					</div>
					<Button
						onClick={handleUseDefaultTemplate}
						size="sm"
						variant="outline"
						className="text-purple-600 border-purple-300 hover:bg-purple-50"
					>
						<RefreshCw className="w-4 h-4 mr-2"/>
						恢复默认
					</Button>
				</div>

				<div className="space-y-4">
					<textarea
						value={aiPromptTemplate}
						onChange={(e) => handlePromptTemplateChange(e.target.value)}
						placeholder="输入自定义的AI提示词模板..."
						className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-0 h-40 resize-y font-mono text-sm transition-colors"
					/>

					{/* 模板变量说明 */}
					<div
						className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4">
						<div className="flex items-center gap-2 mb-3">
							<Code className="h-4 w-4 text-yellow-600"/>
							<h5 className="text-sm font-medium text-yellow-800">可用的模板变量</h5>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
							{[
								{var: '{{content}}', desc: '文章正文内容（已移除frontmatter）'},
								{var: '{{filename}}', desc: '当前文件名（不含扩展名）'},
								{var: '{{personalInfo.name}}', desc: '个人信息中的姓名'},
								{var: '{{personalInfo.bio}}', desc: '个人信息中的简介'},
								{var: '{{personalInfo.email}}', desc: '个人信息中的邮箱'},
								{var: '{{personalInfo.website}}', desc: '个人信息中的网站'},
								{var: '{{frontmatter}}', desc: '当前文档的frontmatter对象'},
								{var: '{{today}}', desc: '当前日期（YYYY-MM-DD格式）'}
							].map((item, index) => (
								<div key={index} className="bg-white/60 border border-yellow-200 rounded-lg p-2">
									<code className="text-yellow-700 font-medium">{item.var}</code>
									<p className="text-yellow-600 mt-1">{item.desc}</p>
								</div>
							))}
						</div>
						<div className="mt-3 pt-3 border-t border-yellow-300">
							<p className="text-xs text-yellow-700 flex items-center gap-2">
								<Info className="w-3 h-3"/>
								支持Handlebars语法：条件判断 <code>{'{{#if variable}}'}</code>，循环遍历 <code>{'{{#each array}}'}</code>
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* API密钥获取指南 */}
			<div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
				<div className="flex items-center gap-3 mb-4">
					<div className="p-2 bg-blue-100 rounded-lg">
						<ExternalLink className="h-5 w-5 text-blue-600"/>
					</div>
					<div>
						<h4 className="font-semibold text-gray-900">获取API密钥</h4>
						<p className="text-sm text-gray-600">简单几步，获取您的Claude AI访问密钥</p>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-5 gap-3">
					{[
						{step: '1', icon: ExternalLink, title: '访问控制台', desc: '前往Anthropic官网'},
						{step: '2', icon: User, title: '注册登录', desc: '创建或登录账户'},
						{step: '3', icon: Key, title: '创建密钥', desc: '生成新的API密钥'},
						{step: '4', icon: Save, title: '复制密钥', desc: '保存到剪贴板'},
						{step: '5', icon: CheckCircle, title: '配置完成', desc: '粘贴到上方输入框'}
					].map((step, index) => (
						<div key={index}
							 className="group bg-gradient-to-br from-gray-50 to-blue-50 border border-gray-200 rounded-lg p-3 hover:shadow-md transition-all">
							<div className="flex items-center gap-2 mb-2">
								<div
									className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
									{step.step}
								</div>
								<step.icon className="w-4 h-4 text-blue-600"/>
							</div>
							<h5 className="text-sm font-medium text-gray-800">{step.title}</h5>
							<p className="text-xs text-gray-600 mt-1">{step.desc}</p>
						</div>
					))}
				</div>

				<div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
					<p className="text-sm text-blue-800 flex items-center gap-2">
						<Info className="w-4 h-4"/>
						立即访问：
						<a
							href="https://console.anthropic.com/"
							target="_blank"
							rel="noopener noreferrer"
							className="text-blue-600 hover:text-blue-800 underline font-medium"
						>
							https://console.anthropic.com/
						</a>
					</p>
				</div>
			</div>

			{/* 操作按钮 */}
			<div className="flex justify-between items-center pt-2">
				<Button
					onClick={handleReset}
					variant="outline"
					className="text-red-600 border-red-300 hover:bg-red-50"
				>
					<RotateCcw className="w-4 h-4 mr-2"/>
					清空设置
				</Button>
				<Button
					onClick={handleSave}
					className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
				>
					<Save className="w-4 h-4 mr-2"/>
					保存设置
				</Button>
			</div>
		</div>
	);
};
