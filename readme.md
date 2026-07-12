# 程序员做饭指南 · 个人网站

这是 [HowToCook](https://github.com/Anduin2017/HowToCook) 菜谱库的个人精美网站版本。网站会自动读取 `dishes/` 和 `tips/` 目录下的 Markdown 菜谱，生成可浏览、可搜索的静态网页。

## 网站功能

| 功能 | 说明 |
|------|------|
| 首页 | 分类入口、精选菜谱、搜索框 |
| 分类浏览 | 10 大分类：素菜、荤菜、水产、早餐、主食等 |
| 菜谱详情 | 原料、用量计算、操作步骤、成品图片 |
| 烹饪技巧 | 厨房准备、烹饪技法、进阶技巧 |
| 搜索 | 按菜名或关键词快速查找 |
| 深色模式 | 点击右上角按钮切换 |

## 本地预览（3 步）

**前提**：电脑已安装 [Node.js](https://nodejs.org/) 18 或以上版本。

```bash
# 1. 进入网站目录
cd site

# 2. 安装依赖（只需第一次）
npm install

# 3. 启动本地预览
npm run dev
```

浏览器打开终端里显示的地址（通常是 `http://localhost:4321`），即可预览网站。

## 构建正式版本

```bash
cd site
npm run build
```

构建结果在 `site/dist/` 目录，可部署到任何静态网站托管服务。

从项目根目录也可以运行：

```bash
npm run build:site
```

## 部署上线

### 方式一：GitHub Pages（推荐，免费）

1. 将代码推送到 GitHub 仓库
2. 进入仓库 **Settings → Pages**
3. **Source** 选择 **GitHub Actions**
4. 推送代码后，`.github/workflows/deploy-site.yml` 会自动构建并发布
5. 访问地址：`https://你的用户名.github.io/HowToCook/`

### 方式二：Vercel / Netlify

1. 在 Vercel 或 Netlify 导入本仓库
2. 构建设置：
   - **Root Directory**: `site`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. 部署完成后即可获得 HTTPS 网址

## 如何添加新菜谱

1. 在 `dishes/` 对应分类目录下新建 Markdown 文件
2. 参考 `dishes/template/示例菜/示例菜.md` 的格式编写
3. 重新运行 `npm run dev` 或 `npm run build`，网站会自动包含新菜谱

**注意**：不要手动修改 `README.md` 里的菜谱索引，它是自动生成的。

## 目录结构

```
├── dishes/          # 菜谱 Markdown 文件（网站数据来源）
├── tips/            # 烹饪技巧文章
├── site/            # 网站工程（Astro 静态站点）
│   ├── src/
│   │   ├── pages/       # 页面路由
│   │   ├── components/  # UI 组件
│   │   ├── layouts/     # 页面布局
│   │   └── lib/         # 菜谱解析逻辑
│   └── public/          # 静态资源
└── readme.md        # 本说明文件
```

## 技术栈

- **内容**：Markdown 中文菜谱
- **网站**：Astro 7 静态站点生成器
- **样式**：原生 CSS，暖色美食杂志风
- **搜索**：客户端关键词匹配

## 常见问题

**Q：图片不显示？**  
A：菜谱图片放在与 `.md` 文件同目录下，用相对路径引用，例如 `![](./成品.jpg)`。构建时会自动复制到网站。

**Q：本地预览正常，GitHub Pages 样式错乱？**  
A：GitHub Pages 项目站需要设置 `BASE_PATH`。部署工作流已配置为 `/HowToCook`，本地开发默认不需要。

**Q：如何修改网站标题和介绍？**  
A：编辑 `site/src/pages/index.astro` 首页文字，以及 `site/src/components/Header.astro` 导航栏标题。
