# 历史一次性迁移脚本

本目录存放已完成全量数据迁移、不再纳入 `package.json` 的命令脚本。  
若需对旧数据重做迁移，可手动执行，例如：

```bash
# 须在仓库根目录执行
npx tsx scripts/archive/migrations/migrate-meta-schema-version.mjs --write
```

日常校验与开发请使用仓库根目录的 `npm run validate:all`、`npm run dev:all` 等命令。
