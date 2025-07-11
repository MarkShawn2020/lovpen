import React, {useEffect, useState} from "react";
import {BrandSection} from "./BrandSection";
import {StyleSettings} from "./StyleSettings";
import {CoverDesigner} from "./CoverDesigner";
import {ArticleInfo, ArticleInfoData} from "./ArticleInfo";
import {Tabs, TabsList, TabsTrigger, TabsContent} from "../ui/tabs";
import {ConfigComponent} from "./PluginConfigComponent";
import {SettingsModal} from "../settings/SettingsModal";
import {UnifiedPluginData, ViteReactSettings, PersonalInfo} from "../../types";
import {CoverData} from "@/components/toolbar/CoverData";
import {logger} from "../../../../shared/src/logger";
import { 
	FileText, 
	Palette, 
	Plug, 
	Image, 
	CheckCircle2, 
	XCircle, 
	Zap, 
	Download 
} from "lucide-react";

interface ToolbarProps {
	settings: ViteReactSettings;
	plugins: UnifiedPluginData[];
	articleHTML: string;
	onRefresh: () => void;
	onCopy: () => void;
	onDistribute: () => void;
	onTemplateChange: (template: string) => void;
	onThemeChange: (theme: string) => void;
	onHighlightChange: (highlight: string) => void;
	onThemeColorToggle: (enabled: boolean) => void;
	onThemeColorChange: (color: string) => void;
	onRenderArticle: () => void;
	onSaveSettings: () => void;
	onPluginToggle?: (pluginName: string, enabled: boolean) => void;
	onPluginConfigChange?: (pluginName: string, key: string, value: string | boolean) => void;
	onExpandedSectionsChange?: (sections: string[]) => void;
	onArticleInfoChange?: (info: ArticleInfoData) => void;
	onPersonalInfoChange?: (info: PersonalInfo) => void;
	onSettingsChange?: (settings: Partial<ViteReactSettings>) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
													settings,
													plugins,
													articleHTML,
													onRefresh,
													onCopy,
													onDistribute,
													onTemplateChange,
													onThemeChange,
													onHighlightChange,
													onThemeColorToggle,
													onThemeColorChange,
													onRenderArticle,
													onSaveSettings,
													onPluginToggle,
													onPluginConfigChange,
													onExpandedSectionsChange,
													onArticleInfoChange,
													onPersonalInfoChange,
													onSettingsChange,
												}) => {
	logger.info("[Toolbar] 完整工具栏开始渲染", {
		pluginsCount: plugins?.length || 0,
		settingsKeys: Object.keys(settings || {}),
		showStyleUI: settings?.showStyleUI,
		expandedSections: settings?.expandedAccordionSections
	});

	// 使用本地状态管理当前选中的tab
	const [activeTab, setActiveTab] = useState<string>(() => {
		// 默认选择基本信息tab
		return 'info';
	});

	// 插件管理中的子tab状态
	const [pluginTab, setPluginTab] = useState<string>(() => {
		// 默认选择第一个有插件的类型
		const remarkPlugins = plugins.filter(plugin => plugin.type === 'remark');
		const rehypePlugins = plugins.filter(plugin => plugin.type === 'rehype');
		
		if (remarkPlugins.length > 0) return 'remark';
		if (rehypePlugins.length > 0) return 'rehype';
		return 'remark';
	});

	// 插件展开状态管理
	const [pluginExpandedSections, setPluginExpandedSections] = useState<string[]>(
		settings.expandedAccordionSections || []
	);

	// 设置模态框状态
	const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);


	// 当外部settings发生变化时，同步更新本地状态
	useEffect(() => {
		// 如果当前tab是样式设置但样式设置被关闭了，切换到基本信息
		if (activeTab === 'style' && !settings.showStyleUI) {
			setActiveTab('info');
		}
		// 同步插件展开状态
		setPluginExpandedSections(settings.expandedAccordionSections || []);
	}, [settings.showStyleUI, activeTab, settings.expandedAccordionSections]);

	const handleTabChange = (value: string) => {
		setActiveTab(value);
		// 保存当前选中的tab到settings
		const newSections = [value];
		if (onExpandedSectionsChange) {
			onExpandedSectionsChange(newSections);
		}
		onSaveSettings();
	};

	// 分离不同类型的插件
	const remarkPlugins = plugins.filter(plugin => plugin.type === 'remark');
	const rehypePlugins = plugins.filter(plugin => plugin.type === 'rehype');

	// 批量操作函数
	const handleBatchToggle = (pluginType: 'remark' | 'rehype', enabled: boolean) => {
		const targetPlugins = pluginType === 'remark' ? remarkPlugins : rehypePlugins;
		targetPlugins.forEach(plugin => {
			if (onPluginToggle) {
				onPluginToggle(plugin.name, enabled);
			}
		});
		// 触发重新渲染
		onRenderArticle();
	};

	// 处理插件展开/折叠
	const handlePluginToggle = (sectionId: string, isExpanded: boolean) => {
		let newSections: string[];
		if (isExpanded) {
			newSections = pluginExpandedSections.includes(sectionId)
				? pluginExpandedSections
				: [...pluginExpandedSections, sectionId];
		} else {
			newSections = pluginExpandedSections.filter(id => id !== sectionId);
		}
		
		// 更新本地状态
		setPluginExpandedSections(newSections);
		
		// 通过回调函数更新外部settings
		if (onExpandedSectionsChange) {
			onExpandedSectionsChange(newSections);
		}
		onSaveSettings();
	};

	// 处理封面下载
	const handleDownloadCovers = async (covers: CoverData[]) => {
		logger.info("[Toolbar] 下载封面", { count: covers.length });
		
		const cover1 = covers.find(c => c.aspectRatio === '2.25:1');
		const cover2 = covers.find(c => c.aspectRatio === '1:1');
		
		// 下载单独的封面
		for (const [index, cover] of covers.entries()) {
			try {
				let arrayBuffer: ArrayBuffer;
				
				// 检查URL类型并相应处理
				if (cover.imageUrl.startsWith('http://') || cover.imageUrl.startsWith('https://')) {
					// HTTP/HTTPS URL - 使用Obsidian的requestUrl API
					const app = (window as any).app;
					const { requestUrl } = require('obsidian');
					
					const response = await requestUrl({
						url: cover.imageUrl,
						method: 'GET'
					});
					
					arrayBuffer = response.arrayBuffer;
				} else if (cover.imageUrl.startsWith('blob:') || cover.imageUrl.startsWith('data:')) {
					// Blob URL 或 Data URL - 使用fetch API
					const response = await fetch(cover.imageUrl);
					if (!response.ok) {
						throw new Error(`Failed to fetch blob: ${response.status}`);
					}
					arrayBuffer = await response.arrayBuffer();
				} else {
					console.error(`封面 ${index + 1} URL协议不支持: ${cover.imageUrl}`);
					continue;
				}
				
				const uint8Array = new Uint8Array(arrayBuffer);
				const fileName = `cover-${index + 1}-${cover.aspectRatio}.jpg`;
				
				// 使用Obsidian的文件系统API保存文件
				const app = (window as any).app;
				if (app?.vault?.adapter?.write) {
					await app.vault.adapter.write(fileName, uint8Array);
					console.log(`封面 ${index + 1} 已保存到: ${fileName} (${uint8Array.length} bytes)`);
				} else {
					console.error("无法访问Obsidian文件系统API");
				}
			} catch (error) {
				console.error(`下载封面 ${index + 1} 失败:`, error);
			}
		}
		
		// 如果有两个封面，创建拼接图
		if (cover1 && cover2) {
			try {
				await createCombinedCover(cover1, cover2);
			} catch (error) {
				console.error("创建拼接封面失败:", error);
			}
		}
		
		if (covers.length > 0) {
			alert(`已下载 ${covers.length} 个封面到vault根目录${cover1 && cover2 ? '，并创建了拼接图' : ''}`);
		}
	};

	// 创建拼接封面
	const createCombinedCover = async (cover1: CoverData, cover2: CoverData) => {
		try {
			// 获取图片数据的通用函数
			const getImageData = async (imageUrl: string) => {
				if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
					// HTTP/HTTPS URL - 使用Obsidian的requestUrl API
					const app = (window as any).app;
					const { requestUrl } = require('obsidian');
					const response = await requestUrl({ url: imageUrl, method: 'GET' });
					return response.arrayBuffer;
				} else if (imageUrl.startsWith('blob:') || imageUrl.startsWith('data:')) {
					// Blob URL 或 Data URL - 使用fetch API
					const response = await fetch(imageUrl);
					if (!response.ok) {
						throw new Error(`Failed to fetch image: ${response.status}`);
					}
					return await response.arrayBuffer();
				} else {
					throw new Error(`不支持的URL协议: ${imageUrl}`);
				}
			};
			
			// 下载两张图片的数据
			const [arrayBuffer1, arrayBuffer2] = await Promise.all([
				getImageData(cover1.imageUrl),
				getImageData(cover2.imageUrl)
			]);
			
			// 创建blob URL
			const blob1 = new Blob([arrayBuffer1], { type: 'image/jpeg' });
			const blob2 = new Blob([arrayBuffer2], { type: 'image/jpeg' });
			const url1 = URL.createObjectURL(blob1);
			const url2 = URL.createObjectURL(blob2);
			
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');
			
			// 设置画布尺寸 (3.25:1 比例，高度600px，提高分辨率)
			const height = 600;
			const width = height * 3.25;
			canvas.width = width;
			canvas.height = height;
			
			// 加载图片
			const img1 = document.createElement('img');
			const img2 = document.createElement('img');
			
			const loadImage = (img: HTMLImageElement, url: string): Promise<void> => {
				return new Promise((resolve, reject) => {
					img.onload = () => resolve();
					img.onerror = reject;
					img.src = url;
				});
			};
			
			await Promise.all([
				loadImage(img1, url1),
				loadImage(img2, url2)
			]);
			
			// 绘制第一张图 (2.25:1 比例)
			const img1Width = height * 2.25;
			ctx?.drawImage(img1, 0, 0, img1Width, height);
			
			// 绘制第二张图 (1:1 比例)
			const img2Width = height;
			ctx?.drawImage(img2, img1Width, 0, img2Width, height);
			
			// 清理blob URL
			URL.revokeObjectURL(url1);
			URL.revokeObjectURL(url2);
			
			// 转换为blob并保存（提高JPEG质量到95%）
			canvas.toBlob(async (blob) => {
				if (blob) {
					const arrayBuffer = await blob.arrayBuffer();
					const uint8Array = new Uint8Array(arrayBuffer);
					const fileName = `cover-combined-3.25-1.jpg`;
					
					const app = (window as any).app;
					if (app?.vault?.adapter?.write) {
						await app.vault.adapter.write(fileName, uint8Array);
						console.log(`拼接封面已保存到: ${fileName} (${uint8Array.length} bytes)`);
					}
				}
			}, 'image/jpeg', 0.95);
			
		} catch (error) {
			console.error("创建拼接封面失败:", error);
		}
	};

	try {
		return (
			<div className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-blue-50" style={{
				minWidth: '320px',
				width: '100%',
				overflow: 'hidden'
			}}>
				<BrandSection 
					onCopy={onCopy} 
					onDistribute={onDistribute}
					onSettings={() => setIsSettingsModalOpen(true)}
				/>

				<div className="flex-1 overflow-y-auto overflow-x-hidden">
					<div className="p-6" style={{ minWidth: '320px' }}>
						{/* 工具栏标题 */}
						<div className="mb-6">
							<h2 className="text-xl font-bold text-gray-900 mb-2">内容工具栏</h2>
							<p className="text-sm text-gray-600">管理文章信息、样式和插件配置</p>
						</div>
						
						<Tabs value={activeTab} onValueChange={handleTabChange}>
							<TabsList className="grid w-full grid-cols-4 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-xl p-1">
								<TabsTrigger 
									value="info"
									className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
								>
									<FileText className="h-4 w-4" />
									<span className="hidden sm:inline">基本信息</span>
								</TabsTrigger>
								{settings.showStyleUI && (
									<TabsTrigger 
										value="style"
										className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm"
									>
										<Palette className="h-4 w-4" />
										<span className="hidden sm:inline">样式</span>
									</TabsTrigger>
								)}
								<TabsTrigger 
									value="plugins"
									className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-green-600 data-[state=active]:shadow-sm"
								>
									<Plug className="h-4 w-4" />
									<span className="hidden sm:inline">插件</span>
									<span className="bg-gray-200 text-gray-700 text-xs px-1.5 py-0.5 rounded-full ml-1">
										{plugins.length}
									</span>
								</TabsTrigger>
								<TabsTrigger 
									value="cover"
									className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm"
								>
									<Image className="h-4 w-4" />
									<span className="hidden sm:inline">封面</span>
								</TabsTrigger>
							</TabsList>
							
							<TabsContent value="info" className="mt-6">
								<div className="bg-white/60 backdrop-blur-sm border border-gray-200 rounded-xl p-6 shadow-sm">
									<ArticleInfo
										settings={settings}
										onSaveSettings={onSaveSettings}
										onInfoChange={onArticleInfoChange || (() => {})}
										onRenderArticle={onRenderArticle}
										onSettingsChange={onSettingsChange}
									/>
								</div>
							</TabsContent>
							
							{settings.showStyleUI && (
								<TabsContent value="style" className="mt-6">
									<div className="bg-white/60 backdrop-blur-sm border border-gray-200 rounded-xl p-6 shadow-sm">
										<StyleSettings
											settings={settings}
											onTemplateChange={onTemplateChange}
											onThemeChange={onThemeChange}
											onHighlightChange={onHighlightChange}
											onThemeColorToggle={onThemeColorToggle}
											onThemeColorChange={onThemeColorChange}
										/>
									</div>
								</TabsContent>
							)}

							<TabsContent value="plugins" className="mt-6">
								<div className="bg-white/60 backdrop-blur-sm border border-gray-200 rounded-xl p-6 shadow-sm">
									{plugins.length > 0 ? (
										<Tabs value={pluginTab} onValueChange={setPluginTab}>
											<div className="mb-4">
												<h3 className="text-lg font-semibold text-gray-900 mb-2">插件管理</h3>
												<p className="text-sm text-gray-600">配置和管理Markdown处理插件</p>
											</div>
											
											<TabsList className="bg-gray-100 rounded-lg p-1">
												{remarkPlugins.length > 0 && (
													<TabsTrigger 
														value="remark"
														className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
													>
														<Plug className="h-4 w-4" />
														Remark 
														<span className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">
															{remarkPlugins.length}
														</span>
													</TabsTrigger>
												)}
												{rehypePlugins.length > 0 && (
													<TabsTrigger 
														value="rehype"
														className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
													>
														<Zap className="h-4 w-4" />
														Rehype 
														<span className="bg-purple-100 text-purple-700 text-xs px-1.5 py-0.5 rounded-full">
															{rehypePlugins.length}
														</span>
													</TabsTrigger>
												)}
											</TabsList>
											
											{remarkPlugins.length > 0 && (
												<TabsContent value="remark" className="mt-6">
													<div className="space-y-4">
														<div className="flex justify-between items-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
															<div>
																<h4 className="font-semibold text-blue-900">Remark 插件</h4>
																<p className="text-sm text-blue-700">Markdown语法解析插件 ({remarkPlugins.length}个)</p>
															</div>
															<div className="flex space-x-2">
																<button
																	onClick={() => handleBatchToggle('remark', true)}
																	className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
																>
																	<CheckCircle2 className="h-4 w-4" />
																	全部启用
																</button>
																<button
																	onClick={() => handleBatchToggle('remark', false)}
																	className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
																>
																	<XCircle className="h-4 w-4" />
																	全部关闭
																</button>
															</div>
														</div>
														<div className="space-y-1">
															{remarkPlugins.map((plugin) => (
																<ConfigComponent
																	key={plugin.name}
																	item={plugin}
																	type="plugin"
																	expandedSections={pluginExpandedSections}
																	onToggle={handlePluginToggle}
																	onEnabledChange={(pluginName, enabled) => onPluginToggle?.(pluginName, enabled)}
																	onConfigChange={async (pluginName, key, value) => {
																		console.log(`[Toolbar] Remark插件配置变更: ${pluginName}.${key} = ${value}`);

																		if (onPluginConfigChange) {
																			try {
																				const result = onPluginConfigChange(pluginName, key, value) as any;
																				if (result && typeof result?.then === 'function') {
																					await result;
																				}
																				console.log(`[Toolbar] Remark插件配置更新完成: ${pluginName}.${key}`);
																			} catch (error) {
																				console.error(`[Toolbar] Remark插件配置更新失败:`, error);
																			}
																		}

																		console.log(`[Toolbar] 触发重新渲染: ${pluginName}.${key}`);
																		onRenderArticle();
																	}}
																/>
															))}
														</div>
													</div>
												</TabsContent>
											)}

											{rehypePlugins.length > 0 && (
												<TabsContent value="rehype" className="mt-6">
													<div className="space-y-4">
														<div className="flex justify-between items-center p-4 bg-purple-50 border border-purple-200 rounded-lg">
															<div>
																<h4 className="font-semibold text-purple-900">Rehype 插件</h4>
																<p className="text-sm text-purple-700">HTML处理和转换插件 ({rehypePlugins.length}个)</p>
															</div>
															<div className="flex space-x-2">
																<button
																	onClick={() => handleBatchToggle('rehype', true)}
																	className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
																>
																	<CheckCircle2 className="h-4 w-4" />
																	全部启用
																</button>
																<button
																	onClick={() => handleBatchToggle('rehype', false)}
																	className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
																>
																	<XCircle className="h-4 w-4" />
																	全部关闭
																</button>
															</div>
														</div>
														<div className="space-y-1">
															{rehypePlugins.map((plugin) => (
																<ConfigComponent
																	key={plugin.name}
																	item={plugin}
																	type="plugin"
																	expandedSections={pluginExpandedSections}
																	onToggle={handlePluginToggle}
																	onEnabledChange={(pluginName, enabled) => onPluginToggle?.(pluginName, enabled)}
																	onConfigChange={async (pluginName, key, value) => {
																		console.log(`[Toolbar] Rehype插件配置变更: ${pluginName}.${key} = ${value}`);

																		if (onPluginConfigChange) {
																			try {
																				const result = onPluginConfigChange(pluginName, key, value) as any;
																				if (result && typeof result?.then === 'function') {
																					await result;
																				}
																				console.log(`[Toolbar] Rehype插件配置更新完成: ${pluginName}.${key}`);
																			} catch (error) {
																				console.error(`[Toolbar] Rehype插件配置更新失败:`, error);
																			}
																		}

																		onRenderArticle();
																	}}
																/>
															))}
														</div>
													</div>
												</TabsContent>
											)}
										</Tabs>
									) : (
										<div className="text-center py-12">
											<div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
												<Plug className="h-12 w-12 text-gray-400 mx-auto mb-3" />
												<h3 className="text-lg font-medium text-gray-900 mb-2">暂无插件</h3>
												<p className="text-sm text-gray-500">当前没有可用的Markdown处理插件</p>
											</div>
										</div>
									)}
								</div>
							</TabsContent>

							<TabsContent value="cover" className="mt-6">
								<div className="bg-white/60 backdrop-blur-sm border border-gray-200 rounded-xl p-6 shadow-sm">
									<CoverDesigner
										articleHTML={articleHTML}
										onDownloadCovers={handleDownloadCovers}
										onClose={() => {}}
									/>
								</div>
							</TabsContent>
						</Tabs>
					</div>
				</div>
				
				{/* 设置模态框 */}
				<SettingsModal
					isOpen={isSettingsModalOpen}
					onClose={() => setIsSettingsModalOpen(false)}
					personalInfo={settings.personalInfo}
					onPersonalInfoChange={onPersonalInfoChange || (() => {})}
					onSaveSettings={onSaveSettings}
					settings={settings}
					onSettingsChange={onSettingsChange || (() => {})}
				/>
			</div>
		);
	} catch (error) {
		logger.error("[Toolbar] 完整工具栏渲染错误:", error);
		return (
			<div className="h-full flex flex-col bg-white p-4">
				<div className="text-red-500">
					<h3>完整工具栏渲染失败</h3>
					<p>错误信息: {error instanceof Error ? error.message : String(error)}</p>
				</div>
			</div>
		);
	}
};
