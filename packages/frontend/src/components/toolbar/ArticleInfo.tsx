import React, {useEffect, useState} from 'react';
import {Button} from '../ui/button';
import {ViteReactSettings} from '../../types';
import {logger} from '../../../../shared/src/logger';
import Handlebars from 'handlebars';
import { AIAnalysisSplitButton, AIStyle } from '../ui/ai-analysis-split-button';
import { CustomPromptModal } from '../ui/custom-prompt-modal';

interface ArticleInfoProps {
	settings: ViteReactSettings;
	onSaveSettings: () => void;
	onInfoChange: (info: ArticleInfoData) => void;
	onRenderArticle?: () => void;
	onSettingsChange?: (settings: Partial<ViteReactSettings>) => void;
}

export interface ArticleInfoData {
	author: string;
	publishDate: string;
	articleTitle: string;
	articleSubtitle: string;
	episodeNum: string;
	seriesName: string;
	tags: string[];
}

// 获取默认作者：个人信息设置 -> 默认值
const getDefaultAuthor = (settings: ViteReactSettings): string => {
	if (settings.personalInfo?.name && settings.personalInfo.name.trim() !== '') {
		return settings.personalInfo.name.trim();
	}
	return '南川同学'; // 最终默认值
};

const getDefaultArticleInfo = (settings: ViteReactSettings): ArticleInfoData => ({
	author: getDefaultAuthor(settings), // 使用新的作者逻辑
	publishDate: new Date().toISOString().split('T')[0], // 默认今天
	articleTitle: '', // 将由文件名填充
	articleSubtitle: '',
	episodeNum: '',
	seriesName: '',
	tags: []
});

export const ArticleInfo: React.FC<ArticleInfoProps> = ({
															settings,
															onSaveSettings,
															onInfoChange,
															onRenderArticle,
															onSettingsChange
														}) => {
	const [isAIGenerating, setIsAIGenerating] = useState(false);
	const [isCustomPromptModalOpen, setIsCustomPromptModalOpen] = useState(false);
	const [articleInfo, setArticleInfo] = useState<ArticleInfoData>(() => {
		// 从localStorage读取保存的文章信息
		const saved = localStorage.getItem('lovpen-article-info');
		const defaultInfo = getDefaultArticleInfo(settings);

		if (saved) {
			try {
				const savedInfo = JSON.parse(saved);
				// 合并保存的信息和默认信息，但要更新作者字段以使用最新的个人信息设置
				return {
					...defaultInfo,
					...savedInfo,
					// 如果保存的作者为空或为旧的默认值，则使用新的默认作者
					author: savedInfo.author && savedInfo.author.trim() !== '' && savedInfo.author !== '南川同学'
						? savedInfo.author
						: defaultInfo.author
				};
			} catch (error) {
				logger.warn('解析保存的文章信息失败:', error);
				return defaultInfo;
			}
		}
		return defaultInfo;
	});

	// 初始化时设置文章标题为文件名（如果标题为空），确保作者不为空
	useEffect(() => {
		let needsUpdate = false;
		const updates: Partial<ArticleInfoData> = {};

		// 设置默认文章标题为文件名
		if (!articleInfo.articleTitle) {
			const currentFileName = getCurrentFileName();
			if (currentFileName) {
				updates.articleTitle = currentFileName;
				needsUpdate = true;
			}
		}

		// 确保作者不为空
		if (!articleInfo.author) {
			updates.author = getDefaultAuthor(settings);
			needsUpdate = true;
		}

		if (needsUpdate) {
			setArticleInfo(prev => ({
				...prev,
				...updates
			}));
		}
	}, []); // 只在组件挂载时执行一次

	// 当文章信息变化时，保存到localStorage并通知父组件
	useEffect(() => {
		localStorage.setItem('lovpen-article-info', JSON.stringify(articleInfo));
		onInfoChange(articleInfo);
	}, [articleInfo, onInfoChange]);

	const handleInputChange = (field: keyof ArticleInfoData, value: string) => {
		setArticleInfo(prev => ({
			...prev,
			[field]: value
		}));
	};

	const handleTagsChange = (tagsText: string) => {
		// 支持多种分隔符：逗号、换行、分号
		const tags = tagsText
			.split(/[,\n;]+/)
			.map(tag => tag.trim())
			.filter(tag => tag.length > 0);

		setArticleInfo(prev => ({
			...prev,
			tags
		}));
	};

	const handleAIAnalyze = async (style: AIStyle) => {
		// 检查是否配置了Claude API密钥
		if (!settings.authKey || settings.authKey.trim() === '') {
			alert('请先在设置页面配置Claude API密钥才能使用AI分析功能');
			return;
		}

		// 获取当前活跃的文档
		const app = (window as any).app;
		if (!app) {
			alert('无法获取Obsidian应用实例');
			return;
		}

		const activeFile = app.workspace.getActiveFile();
		if (!activeFile) {
			alert('请先打开一个笔记文件');
			return;
		}

		setIsAIGenerating(true);

		try {
			// 读取文档内容
			const content = await app.vault.read(activeFile);
			
			// 移除frontmatter，只分析正文内容
			const cleanContent = content.replace(/^---\n[\s\S]*?\n---\n?/, '');
			
			if (cleanContent.trim().length < 50) {
				alert('文章内容太短，无法进行有效分析');
				return;
			}
			
			// 调用Claude AI分析，使用指定的风格
			const aiSuggestion = await analyzeContentWithClaude(cleanContent, activeFile.basename, style);
			
			// 合并现有信息和AI建议
			const finalSuggestion = {
				author: aiSuggestion.author || articleInfo.author || getDefaultAuthor(settings),
				publishDate: aiSuggestion.publishDate || new Date().toISOString().split('T')[0],
				articleTitle: aiSuggestion.articleTitle || activeFile.basename,
				articleSubtitle: aiSuggestion.articleSubtitle || '',
				episodeNum: aiSuggestion.episodeNum || '',
				seriesName: aiSuggestion.seriesName || '',
				tags: aiSuggestion.tags || []
			};

			setArticleInfo(finalSuggestion);
			logger.info(`使用 ${style.name} 生成文章信息完成:`, finalSuggestion);

		} catch (error) {
			logger.error(`使用 ${style.name} 生成文章信息失败:`, error);
			alert(`AI分析失败: ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			setIsAIGenerating(false);
		}
	};

	// Claude AI分析函数
	const analyzeContentWithClaude = async (content: string, filename: string, style: AIStyle) => {
		// 获取当前文档的frontmatter
		const app = (window as any).app;
		const activeFile = app.workspace.getActiveFile();
		let frontmatter = {};
		
		if (activeFile) {
			const metadata = app.metadataCache.getFileCache(activeFile);
			frontmatter = metadata?.frontmatter || {};
		}

		// 使用指定风格的模板
		let promptTemplate = style.prompt;

		// 准备模板数据
		const templateData = {
			content: content,
			filename: filename,
			personalInfo: settings.personalInfo || {},
			frontmatter: frontmatter,
			today: new Date().toISOString().split('T')[0]
		};

		// 使用Handlebars渲染模板
		const template = Handlebars.compile(promptTemplate);
		const prompt = template(templateData);
		
		logger.info(`Generated AI prompt for ${style.name}:`, prompt);

		try {
			// 使用Obsidian的requestUrl API来避免CORS问题
			const { requestUrl } = require('obsidian');
			
			const response = await requestUrl({
				url: 'https://api.anthropic.com/v1/messages',
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': settings.authKey || '', // 使用现有的authKey
					'anthropic-version': '2023-06-01'
				},
				body: JSON.stringify({
					model: 'claude-3-sonnet-20240229',
					max_tokens: 1000,
					messages: [
						{
							role: 'user',
							content: prompt
						}
					]
				})
			});

			if (response.status !== 200) {
				throw new Error(`Claude API调用失败: ${response.status}`);
			}

			const result = response.json;
			const aiResponse = result.content[0].text;
			
			// 解析JSON响应
			try {
				const parsedResult = JSON.parse(aiResponse);
				return parsedResult;
			} catch (parseError) {
				logger.warn('解析Claude响应失败，尝试提取JSON:', aiResponse);
				// 尝试从响应中提取JSON
				const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
				if (jsonMatch) {
					return JSON.parse(jsonMatch[0]);
				}
				throw new Error('无法解析Claude的响应格式');
			}

		} catch (error) {
			logger.error('Claude API调用失败:', error);
			throw error;
		}
	};

	const getCurrentFileName = () => {
		try {
			// 从window对象获取当前活动文件名
			const app = (window as any).app;
			const activeFile = app?.workspace?.getActiveFile?.();
			return activeFile?.basename || '';
		} catch (error) {
			logger.warn('获取当前文件名失败:', error);
			return '';
		}
	};


	const handleClearAll = () => {
		// 完全清空，所有字段都变成空值，显示为placeholder
		setArticleInfo({
			author: '',
			publishDate: new Date().toISOString().split('T')[0], // 日期保持当前日期
			articleTitle: '',
			articleSubtitle: '',
			episodeNum: '',
			seriesName: '',
			tags: []
		});
	};

	return (
		<div className="w-full space-y-4">
			<div className="flex justify-between items-center">
				<h3 className="text-lg font-semibold">文章基本信息</h3>
				<div className="flex space-x-2">
					<AIAnalysisSplitButton
						isGenerating={isAIGenerating}
						isDisabled={!settings.authKey || settings.authKey.trim() === ''}
						onAnalyze={handleAIAnalyze}
						onCustomize={() => setIsCustomPromptModalOpen(true)}
					/>
					<Button
						onClick={handleClearAll}
						size="sm"
						variant="outline"
						className="text-gray-600 hover:text-gray-800"
					>
						🗑️ 清空
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{/* 作者 */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						作者
					</label>
					<input
						type="text"
						value={articleInfo.author}
						onChange={(e) => handleInputChange('author', e.target.value)}
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="输入作者名称"
					/>
				</div>

				{/* 发布日期 */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						发布日期
					</label>
					<input
						type="date"
						value={articleInfo.publishDate}
						onChange={(e) => handleInputChange('publishDate', e.target.value)}
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>

				{/* 文章标题 */}
				<div className="md:col-span-2">
					<label className="block text-sm font-medium text-gray-700 mb-1">
						文章标题
					</label>
					<input
						type="text"
						value={articleInfo.articleTitle}
						onChange={(e) => handleInputChange('articleTitle', e.target.value)}
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="输入文章标题"
					/>
				</div>

				{/* 副标题 */}
				<div className="md:col-span-2">
					<label className="block text-sm font-medium text-gray-700 mb-1">
						副标题
					</label>
					<input
						type="text"
						value={articleInfo.articleSubtitle}
						onChange={(e) => handleInputChange('articleSubtitle', e.target.value)}
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="输入副标题"
					/>
				</div>

				{/* 期数 */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						期数
					</label>
					<input
						type="text"
						value={articleInfo.episodeNum}
						onChange={(e) => handleInputChange('episodeNum', e.target.value)}
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="如：第 51 期"
					/>
				</div>

				{/* 系列名称 */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						系列名称
					</label>
					<input
						type="text"
						value={articleInfo.seriesName}
						onChange={(e) => handleInputChange('seriesName', e.target.value)}
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="如：人文与科技"
					/>
				</div>

				{/* 标签 */}
				<div className="md:col-span-2">
					<label className="block text-sm font-medium text-gray-700 mb-1">
						标签
					</label>
					<textarea
						value={articleInfo.tags.join(', ')}
						onChange={(e) => handleTagsChange(e.target.value)}
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
						placeholder="输入标签，支持逗号、换行、分号分隔"
					/>
					<div className="mt-2 flex flex-wrap gap-1">
						{articleInfo.tags.map((tag, index) => (
							<span
								key={index}
								className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
							>
								{tag}
							</span>
						))}
					</div>
				</div>
			</div>

			{/* 自定义Prompt模态框 */}
			<CustomPromptModal
				isOpen={isCustomPromptModalOpen}
				onClose={() => setIsCustomPromptModalOpen(false)}
				settings={settings}
				onSettingsChange={onSettingsChange || (() => {})}
				onSaveSettings={onSaveSettings}
				onAnalyze={handleAIAnalyze}
			/>

		</div>
	);
};
