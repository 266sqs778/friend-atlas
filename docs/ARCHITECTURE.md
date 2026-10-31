# 架构说明

> Friend Atlas 是一个无框架、无构建的静态前端应用。本文说明它的分层、数据流与关键取舍，供代码评审与后续扩展参考。

## 1. 目标与约束

| 约束 | 决策 |
| --- | --- |
| 无后端、无 API Key | 持久层只用 `localStorage`，导入导出走 `File API` + `Blob` |
| 克隆即可运行 | 不引入打包器、不产出构建目录，源码即运行时代码 |
| 离线可用 | ECharts 与 GeoJSON 均放入 `vendor/`，不依赖 CDN |
| 可测试 | 业务逻辑集中在 `src/lib`，全部为纯函数，不触碰 DOM |
| 隐私优先 | 数据不出浏览器；首次进入即告知存储位置 |

## 2. 目录结构

```text
friend-atlas/
├── index.html                 # 唯一页面：语义化骨架 + 三个视图容器 + 浮层
├── src/
│   ├── main.js                # 组合根：初始化、状态、渲染编排、事件绑定
│   ├── styles/
│   │   ├── tokens.css         # 设计令牌（颜色/字号/间距/圆角/动效/暗色）
│   │   └── app.css            # 布局与组件样式
│   ├── data/
│   │   ├── provinces.js       # 省级行政区 → 地级行政区字典（校验与联动唯一来源）
│   │   └── demo-friends.js    # 40 条虚构示例数据
│   ├── lib/                   # 纯函数层（可被 Node 直接 import）
│   │   ├── format.js          # 日期解析、周岁、格式化、首字、百分比
│   │   ├── model.js           # 归一化、校验、去重键
│   │   ├── csv.js             # CSV/JSON 解析与序列化、下载、文件名
│   │   ├── stats.js           # 概览聚合、年龄分桶、排行、省份下钻
│   │   ├── filters.js         # 多维筛选、排序、筛选计数
│   │   ├── storage.js         # localStorage 读写、首次播种、损坏回退
│   │   ├── theme.js           # 主题解析/应用、图表调色板
│   │   └── dom.js             # 选择器、转义、事件委托、焦点陷阱
│   └── features/              # 视图与交互（有状态，消费 lib 的纯函数）
│       ├── map-view.js        # 中国地图热力 + 省份点击
│       ├── network-view.js    # 力导向关系图 + 关系构成列表
│       ├── analytics-view.js  # 四张分析图（懒初始化）
│       ├── list-view.js       # 名录、KPI、省份下钻面板
│       ├── filter-bar.js      # 搜索/多选/排序/重置
│       ├── friend-sheet.js    # 新增/编辑表单与校验
│       ├── import-sheet.js    # 拖拽导入与解析预览
│       └── overlays.js        # 面板栈、Toast、确认对话框
├── tests/                     # 零依赖测试：Node 与浏览器双入口
├── vendor/                    # ECharts、中国 GeoJSON
└── docs/                      # 架构文档与截图
```

## 3. 分层规则

1. `data/` 只导出数据与常量，不 import 任何模块。
2. `lib/` 只依赖 `data/` 和彼此，**不引用 `document` / `window` 顶层副作用**；需要浏览器的能力（下载、存储）通过参数注入，便于测试替身。
3. `features/` 负责 DOM 与 ECharts，可依赖 `lib/`，但**不直接修改全局状态**，只通过回调上报意图。
4. `main.js` 是唯一的状态所有者，也是唯一把视图与数据粘起来的地方。

这条规则让 `tests/` 可以在 Node 里直接 import `src/lib/*.js` 而不需要 `jsdom`。

## 4. 状态与数据流

```text
┌───────────────────── main.js: state ─────────────────────┐
│ friends[] · filters · sort · view · theme · selectedProvince │
└───────────────────────────┬──────────────────────────────┘
                            │ render()
                            ▼
        filterFriends() → sortFriends() → computeOverview()/drillDown()
                            │
        ┌───────────┬───────┴────────┬──────────────┬─────────────┐
        ▼           ▼                ▼              ▼             ▼
    KPI 卡片    地图视图        下钻面板        名录列表      当前页签图表
```

- 视图层只实现 `update(state)`，不做数据加工。
- 用户操作（点击、输入、提交）通过 `onChange` / `onSave` / `onSelect` 回调回到 `main.js`。
- 所有写操作统一走 `persist() → saveFriends()`，失败时以 Toast 告知，不静默吞错。

### 渲染开销控制

- 关键词输入做 120ms 防抖，避免每次按键都重算全量视图。
- `network` / `analytics` 只在对应页签激活时更新；ECharts 实例首次进入页签才 `init`，避免在 `display:none` 容器上以 0 尺寸初始化。
- 主题切换时 `dispose()` 并重建图表实例，确保坐标轴、tooltip、地图配色全部刷新。
- 窗口 `resize` 做 160ms 防抖后统一 `resize()`。

## 5. 关键设计决策

| 决策 | 原因 | 代价 |
| --- | --- | --- |
| 原生 ES Modules，不用框架 | 项目规模下框架收益低于理解成本；简历场景要展示基础功底 | 需要自己实现状态与渲染编排 |
| 视图只做「重绘当前视图」 | 逻辑简单、可预测；40~数百条数据下足够快 | 数据量极大时需要虚拟列表 |
| 地图点击用数据项 `itemStyle` 表示选中 | 不依赖 ECharts `selectedMode` 与 `dispatchAction`，避免在事件回调内重入 `setOption` 导致卡顿 | 需要手动维护选中态 |
| 地图点击回调 `setTimeout(0)` 外抛 | 保证状态更新不会发生在 ECharts 派发事件的栈内 | 多一帧延迟（不可感知） |
| 省份下钻同时提供下拉入口 | 画布区域对键盘与无指针用户不可达，属可访问性补位 | 面板内多一个控件 |
| CSV 表头识别 + 列序兜底 | 兼容自家导出格式与第三方通讯录导出 | 表头少于 3 列时退化为列序解析 |
| 首次访问播种示例数据 | 打开即有内容，Demo 可演示 | 用「键是否存在」区分「没数据」与「用户清空」 |
| 删除只弹提示不弹二次确认 | 已确认过；撤销比二次确认更符合 HIG 的 forgiveness | Toast 期间需要保存快照 |

## 6. 数据模型

```js
{
  id: string,            // crypto.randomUUID 或时间戳+随机串
  name: string,          // ≤ 20 字
  gender: "男" | "女" | "其他",
  birthday: "YYYY-MM-DD" | "",
  province: string,      // 必须命中 provinces.js 的键
  city: string,          // 必须命中该省的城市列表
  relationship: "朋友" | "同学" | "同事" | "亲戚" | "合作伙伴" | "其他",
  notes: string,         // ≤ 500 字
  createdAt: ISOString,
  updatedAt: ISOString
}
```

- 所有入口（表单、CSV、JSON、localStorage）都会经过 `normalizeFriend()` 收敛字段，杜绝脏数据进入视图。
- 去重键为 `姓名|省份|城市`，只在导入时生效，避免误删同名的不同人。

## 7. 错误与降级

| 场景 | 行为 |
| --- | --- |
| 地图 GeoJSON 主源失败 | 自动尝试备用源；仍失败则显示可读提示，其余视图继续可用 |
| ECharts 未加载 | 地图容器输出文字提示，不抛异常 |
| `localStorage` 不可用 | 降级为内存态，提示「无法访问本地存储」，功能不中断 |
| 本地数据 JSON 损坏 | 回退到示例数据并提示，不白屏 |
| 写入超限 | Toast 明确提示「存储空间不足」 |
| CSV 脏行 | 逐行跳过并在导入预览中列出前 3 条原因 |

## 8. 可访问性

- 语义结构：`header / main / nav[role=tablist] / section[role=tabpanel] / article`。
- 键盘：Tab 顺序自然；页签支持左右方向键；`/`、`N`、`T` 全局快捷键；面板内焦点陷阱并在关闭时归还。
- 状态播报：筛选计数、列表、导入状态使用 `aria-live`。
- 视觉：焦点环使用 `:focus-visible`；对比度按 HIG 的 4.5:1 下限设计；`prefers-contrast: more` 提升分隔线与次级文字；`prefers-reduced-motion` 关闭动画。
- 触摸：控件高度 30–40px，移动端列表改为两行布局，操作按钮保持 32px 命中区。

## 9. 测试策略

- `tests/harness.js`：零依赖 `test()` 注册 + 断言 + 统一 runner。
- `tests/run.mjs`：Node 入口，CI 使用；失败时 `exitCode = 1`。
- `tests/index.html`：浏览器入口，便于本地可视化查看（部署到 Pages 后也可访问）。
- 覆盖重点放在**边界与回归**：非法日期、引号内换行、表头乱序、脏行跳过、空集合聚合、排序稳定性、存储损坏与禁用。
- 手工验收覆盖：三页签渲染、下钻两条入口、增删改撤销、导入导出、深浅外观、三档断点。

## 10. 扩展方向

1. **数据层**：抽象 `StorageAdapter`，替换为 IndexedDB 或远端 API 而不动视图。
2. **视图层**：新增「时间线」页签（按认识时间滚动）；关系网切换城市维度聚类。
3. **导入**：支持 vCard / Excel（用 SheetJS 作为可选依赖，保持核心零依赖）。
4. **分享**：导出当前视图为图片（`echarts.getDataURL()` + `canvas` 合成）。
5. **国际化**：把界面文案抽到 `i18n/zh-CN.js`，按 `navigator.language` 切换。
