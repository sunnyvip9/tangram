# 七巧板１０００题练习

这是无需构建的静态网页，直接打开 [index.html](index.html) 即可使用。上传本目录内全部文件到 GitHub 仓库根目录，再在 Settings → Pages 选择 Deploy from a branch、main、／（root）。需要保留 `licenses/` 和 `source/`，包括 `.nojekyll`；不要只上传压缩包。

## 功能

自由练习１０００道图案，四类选题，默认隐藏分块线，可手动显示。模拟比赛随机７题、共５分钟，全部只显示轮廓，可切题，手动交卷或到时自动交卷。只需拖动，朝向已摆好；放对吸附锁定，放错返回。不提供旋转或翻面。

进度保存在当前浏览器本地，无账号。更换域名、浏览器或设备不会自动迁移记录；本地文件地址的进度不会自动带到 GitHub Pages。后台或刷新不暂停比赛，重新打开到期比赛会交卷。

## 文件

- `index.html`：页面结构。
- `app.css`：手机竖屏及其他视口样式。
- `app.js`：界面、拖动事件、选题、提交和恢复进度。
- `engine.js`：板块布局、吸附、计时及状态校验。
- `puzzles.js`：浏览器使用的完整１０００题，含目标轮廓。
- `source/library-1000.json`：原始精确坐标、分类与逐题来源。
- `source/build-puzzles.mjs`：重新生成 `puzzles.js`，只有修改题库时才需要使用。
- `source/upstream/`：GLPeces 原始源码归档及来源哈希。

运行网页没有第三方 CDN、后端或运行时安装步骤。重建题库需本机已有 Node、Python 及 Shapely，在本目录执行 `node source/build-puzzles.mjs`；脚本只生成 `puzzles.js`，不更改界面代码。不要在已有改动未保存时重建。

## 题目来源

[来源及许可](CREDITS.md) 为本包组成部分。第三方素材的公开适用范围需按该文件确认；本包没有声明全部题目为原创、公共领域或可任意商用。
