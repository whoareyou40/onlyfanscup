# 风扇杯 / 足球杯赛积分榜

Vite + React + TypeScript + Tailwind。赛事数据保存在浏览器 **localStorage**（单人录入场景）；可在「设置」页 **导出 / 导入 JSON** 备份与换机迁移。

## 本地开发

```bash
npm install
npm run dev
```

浏览器打开终端里提示的本地地址即可。

## 生产构建

```bash
npm run build
npm run preview
```

产物在 `dist/` 目录。

## 发布到 Vercel（免费）

1. 在 [GitHub](https://github.com) 新建空仓库，将本目录推上去：

   ```bash
   git init
   git add .
   git commit -m "Initial commit: cup standings app"
   git remote add origin https://github.com/<你的用户名>/<仓库名>.git
   git branch -M main
   git push -u origin main
   ```

2. 打开 [Vercel](https://vercel.com)，用 GitHub 登录 → **Add New Project** → 选择该仓库。

3. 框架选 **Vite**（或保持自动检测）。默认设置一般为：
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. 点击 Deploy。完成后会得到一个公开网址。

说明：访问者各自浏览器中的数据互不共享；你作为管理员在自己浏览器里录入即可。换电脑前请使用「导出 JSON」，新电脑打开站点后「导入 JSON」。
