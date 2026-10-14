# ScopeQuote 项目需求与报价助手

ScopeQuote 是一个 Manifest V3 Chrome 扩展，用于把客户或学生项目需求整理成可讨论的范围、功能清单、工时估算与 Markdown 报价草案。数据默认只写入 Chrome 本地扩展存储，不上传服务器，也不要求注册。

> 报价与工时均为辅助估算。实际成本、周期和项目结果不作保证，正式发送前应由你结合真实需求审核。

## 目录

```text
scopequote-extension/
├── extension/                 # 可直接加载的 Chrome 扩展
│   ├── manifest.json
│   ├── popup.html
│   ├── popup.css
│   ├── popup.js
│   └── core.js
├── docs/                      # GitHub Pages 静态官网
│   ├── index.html
│   ├── styles.css
│   ├── site.js
│   ├── mark.svg
│   └── downloads/              # 本地测试下载包；发布后官网链接应指向 Release 附件
├── tests/
│   └── core.test.js
├── scripts/
│   ├── check-project.mjs
│   └── package.ps1
├── package.json
└── README.md
```

## 功能

- 新建、编辑、复制、删除项目评估；删除前会再次确认。
- 搜索项目名称、客户代号、类型、需求描述和来源标题。
- 手动填写需求，或在主动打开扩展后点击按钮读取当前网页选中文字；同时记录网页标题和 URL。
- 编辑功能项、P0/P1/P2 优先级、估算工时和备注。
- 记录交付物、假设条件、项目风险、不包含范围和待确认问题。
- 自动汇总总工时、基础费用、风险预留费用和建议报价。
- 将单份评估导出为包含范围、明细、估算、交付物、假设、风险、排除项、问题及来源的 Markdown。
- 所有评估数据保存在 `chrome.storage.local`。

## 浏览器权限

扩展只申请以下权限：

- `storage`：在本地保存评估记录。
- `activeTab` 与 `scripting`：只有在用户点击“读取当前网页选中文字”后，临时访问当前标签页并读取选择文字、标题与网址。

不申请 `host_permissions`、所有网站访问权限或 `tabs` 权限。扩展不会后台扫描网页，也不会将内容上传。

## 在 Chrome 中安装

1. 下载并解压插件 ZIP，或在本仓库中直接使用 `extension/`。
2. 在 Chrome 地址栏打开 `chrome://extensions`。
3. 开启右上角“开发者模式”。
4. 点击“加载已解压的扩展程序”。
5. 选择仓库中的 `extension/` 文件夹；若使用 ZIP，则选择解压后根目录下含 `manifest.json` 的文件夹。
6. 点击工具栏的 ScopeQuote 图标，新建评估并添加功能项。

## 本地检查和测试

需要 Node.js 18+ 与 Windows PowerShell 5.1 或 PowerShell 7。运行：

```powershell
npm test
npm run check
npm run package
```

- `npm test`：运行费用公式、记录规范化、搜索和 Markdown 导出的自动化测试。
- `npm run check`：校验必需文件、Manifest V3、弹窗入口和最小权限范围。
- `npm run package`：生成 `dist/scopequote-extension.zip`，将本地下载副本放到 `docs/downloads/`，并解压复核 ZIP 根目录中是否直接包含 Manifest V3 的 `manifest.json`。

## 手动测试清单

1. 按上面的步骤加载 `extension/`，确认扩展可启用并打开弹窗。
2. 新建评估，填名称、客户代号、小时费率、币种和风险预留。
3. 添加多个功能项并修改工时、优先级和备注，确认总工时与三项费用即时变化。
4. 返回列表，搜索项目名称或需求文字，再次打开确认数据仍在。
5. 在普通网页选中一段文字，打开扩展并点击“读取当前网页选中文字”，确认需求、标题和来源网址写入；再尝试空选区和 `chrome://` 页面，确认有清楚提示。
6. 复制一条评估；删除副本并确认对话框取消时记录保留、确认时记录移除。
7. 导出 Markdown 文件，检查功能表、费用、交付物、假设、风险、不包含项、待确认问题和来源 URL。
8. 在手机宽度或窄窗口下确认官网导航、内容和按钮不溢出。

## 官网

官网源文件位于 `docs/`，仅使用 HTML、CSS 和原生 JavaScript。可直接在浏览器打开 `docs/index.html` 预览。打包后，“下载插件”按钮会下载本地 ZIP。发布到 GitHub 时，发布流程应在创建 Release 后把下载按钮改成实际的 Release 附件 URL；未发布前不应填写猜测的网址。

## 发布准备

预期仓库名为 `scopequote-extension`，默认分支 `main`，Pages 来源为 `main` 分支的 `/docs`。插件 Release 包只包含 `extension/` 内文件，ZIP 解压后 `manifest.json` 位于归档根部，不包含 `extension/` 外层目录。创建 Release 后，将官网所有下载链接更新为真实附件的 `browser_download_url`，再推送官网修改并检查 Pages 部署状态。未经验证的仓库、Release 与官网 URL 不应写入页面。

本地发布前先执行安全检查，不要提交密码、Token、API Key、客户个人信息、浏览器个人资料或临时文件。

## 当前版本边界

当前版本没有 AI 自动分析、云同步、账号系统、支付、团队协作或 PDF 导出。官网将已实现能力与未来规划分开说明。
