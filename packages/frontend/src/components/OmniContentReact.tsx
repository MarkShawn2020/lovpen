import React, {useCallback, useEffect, useRef, useState} from "react";
import {OmniContentReactProps} from "../types";
import {Toolbar} from "./toolbar/Toolbar";
import {MessageModal} from "./preview/MessageModal";


import {logger} from "../../../shared/src/logger";

export const OmniContentReact: React.FC<OmniContentReactProps> = ({
																	  settings,
																	  articleHTML,
																	  cssContent,
																	  plugins,
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
																	  onUpdateCSSVariables,
																	  onPluginToggle,
																	  onPluginConfigChange,
																	  onExpandedSectionsChange,
																	  onArticleInfoChange,
																	  onPersonalInfoChange,
																	  onSettingsChange
																  }) => {
	logger.debug("[OmniContentReact] Component render started", {
		articleHTMLLength: articleHTML?.length || 0,
		cssContentLength: cssContent?.length || 0,
		cssContentHash: cssContent ? cssContent.substring(0, 50) + "..." : "",
		currentTheme: settings.defaultStyle
	});

	const [isMessageVisible, setIsMessageVisible] = useState(false);
	const [messageTitle, setMessageTitle] = useState("");
	const [showOkButton, setShowOkButton] = useState(false);
	const renderDivRef = useRef<HTMLDivElement>(null);
	const styleElRef = useRef<HTMLStyleElement>(null);
	const articleDivRef = useRef<HTMLDivElement>(null);

	// 工具栏宽度状态 - 默认自适应内容
	const [toolbarWidth, setToolbarWidth] = useState<string>("auto");

	// 强制触发标记，确保 useEffect 能被调用
	const [cssUpdateTrigger, setCssUpdateTrigger] = useState(0);
	const [articleUpdateTrigger, setArticleUpdateTrigger] = useState(0);

	// 组件挂载检查
	useEffect(() => {
		logger.debug("[mount-useEffect] Component mounted");
		
		return () => {
			logger.debug("[mount-useEffect] Component will unmount");
		};
	}, []);

	// 检测 CSS 内容变化并触发更新
	useEffect(() => {
		logger.debug("[css-detect] CSS content changed, triggering update", {
			cssContentLength: cssContent?.length || 0
		});
		setCssUpdateTrigger(prev => prev + 1);
	}, [cssContent]);

	// 更新CSS样式
	useEffect(() => {
		logger.debug("[css-useEffect] CSS update triggered", {
			cssContentLength: cssContent?.length || 0,
			hasStyleRef: !!styleElRef.current,
			trigger: cssUpdateTrigger
		});
		if (styleElRef.current) {
			styleElRef.current.textContent = cssContent;
		}
	}, [cssUpdateTrigger]);

	// 检测文章内容变化并触发更新
	useEffect(() => {
		logger.debug("[article-detect] Article HTML changed, triggering update", {
			articleHTMLLength: articleHTML?.length || 0
		});
		setArticleUpdateTrigger(prev => prev + 1);
	}, [articleHTML]);

	// 更新文章内容
	useEffect(() => {
		logger.debug("[article-useEffect] Article update triggered", {
			articleHTMLLength: articleHTML?.length || 0,
			hasArticleRef: !!articleDivRef.current,
			trigger: articleUpdateTrigger
		});
		if (articleDivRef.current) {
			articleDivRef.current.innerHTML = articleHTML;
		}
	}, [articleUpdateTrigger]);

	// 直接在渲染时更新DOM（作为备用方案）
	useEffect(() => {
		if (styleElRef.current) {
			styleElRef.current.textContent = cssContent;
		}
		if (articleDivRef.current) {
			articleDivRef.current.innerHTML = articleHTML;
		}
	});

	// 显示加载消息
	const showLoading = useCallback((msg: string) => {
		setMessageTitle(msg);
		setShowOkButton(false);
		setIsMessageVisible(true);
	}, []);

	// 显示消息
	const showMsg = useCallback((msg: string) => {
		setMessageTitle(msg);
		setShowOkButton(true);
		setIsMessageVisible(true);
	}, []);

	// 为了避免编译错误，我们保持这些方法的引用
	// showLoading 和 showMsg 方法在实际使用中会被调用
	void showLoading;
	void showMsg;

	// 关闭消息
	const closeMessage = useCallback(() => {
		setIsMessageVisible(false);
	}, []);

	// 拖拽调整工具栏宽度的处理
	const handleMouseDown = useCallback((e: React.MouseEvent) => {
		const toolbarContainer = document.querySelector('.toolbar-container') as HTMLElement;
		if (!toolbarContainer) return;

		const startX = e.clientX;
		const startWidth = toolbarContainer.getBoundingClientRect().width;

		const handleMouseMove = (e: MouseEvent) => {
			// 在row-reverse布局中，向右拖拽增加工具栏宽度，向左拖拽减少工具栏宽度
			// 这样拖拽方向就和视觉上的预期一致了
			const newWidth = startWidth + (e.clientX - startX);
			const minWidth = 320; // 工具栏最小宽度
			const maxWidth = 800; // 工具栏最大宽度

			if (newWidth >= minWidth && newWidth <= maxWidth) {
				setToolbarWidth(`${newWidth}px`);
			}
		};

		const handleMouseUp = () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
		};

		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);
	}, []);

	return (
		<div
			className="note-preview"
			style={{
				display: "flex",
				flexDirection: "row-reverse", // 反向布局，工具栏在右边
				height: "100%",
				width: "100%",
				overflow: "hidden",
				position: "relative",
			}}
		>
			{/* 左侧渲染区域 - 占用剩余空间 */}
			<div
				ref={renderDivRef}
				className="render-div"
				id="render-div"
				style={{
					WebkitUserSelect: "text",
					userSelect: "text",
					padding: "10px",
					flex: "1", // 占用剩余空间
					overflow: "auto",
					borderRight: "1px solid var(--background-modifier-border)",
					minWidth: "300px" // 最小宽度保护
				}}
			>
				<style ref={styleElRef} title="omni-content-style">
					{cssContent}
				</style>
				<div ref={articleDivRef} dangerouslySetInnerHTML={{__html: articleHTML}}/>
			</div>

			{/* 可拖动的分隔条 */}
			<div
				className="column-resizer"
				style={{
					width: "5px",
					backgroundColor: "var(--background-modifier-border)",
					cursor: "col-resize",
					opacity: 0.7,
					transition: "opacity 0.2s",
					zIndex: 10,
					flexShrink: 0 // 防止被压缩
				}}
				onMouseDown={handleMouseDown}
				onMouseEnter={(e) => {
					e.currentTarget.style.opacity = "1";
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.opacity = "0.7";
				}}
			/>

			{/* 右侧工具栏容器 - 自适应内容宽度 */}
			<div
				className="toolbar-container"
				style={{
					width: toolbarWidth,
					height: "100%",
					overflowY: "auto",
					overflowX: "hidden",
					backgroundColor: "var(--background-secondary-alt)",
					borderLeft: "1px solid var(--background-modifier-border)",
					minWidth: "320px", // 最小宽度保护
					flexShrink: 0 // 防止被压缩
				}}
			>
				{(() => {
					logger.debug("[OmniContentReact] 渲染工具栏", {
						pluginsCount: plugins?.length || 0,
						settingsKeys: Object.keys(settings || {}),
						hasOnCopy: !!onCopy,
						hasOnDistribute: !!onDistribute
					});
					return (
						<Toolbar
							settings={settings}
							plugins={plugins}
							articleHTML={articleHTML}
							onRefresh={onRefresh}
							onCopy={onCopy}
							onDistribute={onDistribute}
							onTemplateChange={onTemplateChange}
							onThemeChange={onThemeChange}
							onHighlightChange={onHighlightChange}
							onThemeColorToggle={onThemeColorToggle}
							onThemeColorChange={onThemeColorChange}
							onRenderArticle={onRenderArticle}
							onSaveSettings={onSaveSettings}
							onPluginToggle={onPluginToggle}
							onPluginConfigChange={onPluginConfigChange}
							onExpandedSectionsChange={onExpandedSectionsChange}
							onArticleInfoChange={onArticleInfoChange}
							onPersonalInfoChange={onPersonalInfoChange}
							onSettingsChange={onSettingsChange}
						/>
					);
				})()}
			</div>

			{/* 消息模态框 */}
			<MessageModal
				isVisible={isMessageVisible}
				title={messageTitle}
				showOkButton={showOkButton}
				onClose={closeMessage}
			/>
		</div>
	);
};
