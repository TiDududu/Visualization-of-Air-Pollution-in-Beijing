# 数据目录说明

## 唯一权威发布数据

| 文件 | 说明 |
| --- | --- |
| **`data/beijing-air-quality.csv`** | **唯一权威**的北京逐日空气质量数据（2014-01-01 ～ 2026-05-04，列：`date, pm25, pm10, o3, no2, so2, co`）。所有页面只能引用此文件。 |
| `data/overview/policies.csv` | 政策时间轴元数据（概览页用）。 |
| `data/overview/空气污染治理政策汇总.xlsx` | 政策详情工作簿（概览页客户端解析）。 |
| `data/policy_evaluation/policy_summary.csv` | 政策×污染物效果汇总（政策效果评估页用）。 |
| `data/policy_evaluation/policy_monthly.csv` | 政策执行期逐月变化（政策效果评估页用）。 |
| `data/comparison/` | 对照页（DiD）所用的新德里/对标城市来源数据，便于读者核对。 |

各页面引用约定（统一指向权威文件）：

- 概览页 `Project Milana/`：`../data/beijing-air-quality.csv`
- 对照页 `project_chart/bar-chart-race.html`：`../data/beijing-air-quality.csv`

## 管线中间产物（不得被页面直接引用）

`data/project_time_pipeline/` 下的文件是数据处理流水线的**中间产物**，仅供审计/复现，**页面一律不直接消费**：

- `beijing-air-quality.csv`（原始合并，含缺失）
- `beijing-air-quality-cleaned.csv`（缺失填充后）
- `beijing-air-quality-decomposition.csv`（趋势+季节分解）
- `preprocessing-report.txt`（预处理报告：插补/缺失统计）

> 注意：发布数据的 SO₂ 列仍保留约 22% 原始缺失（见 `preprocessing-report.txt`：填充前 `so2=990`）。逐年/政策聚合在前端按列过滤缺失值后再计算，相关 SO₂ 结论已在页面加保留性说明。

## 防止数据再次漂移

历史上 `beijing-air-quality.csv` 曾存在 3 份并各自漂移（`data/overview/`、`project_chart/`、`project_time_pipeline/`，行数 4491/4496/4496 且 MD5 不同），导致不同页面同一指标对不上。

现已统一为单一权威源。请用守卫脚本校验，不要手工复制副本：

```bash
node scripts/check-data-sources.mjs
```

该脚本会校验：① 权威文件存在；② 除管线目录外不存在其它 `beijing-air-quality.csv`；③ 所有页面引用都指向 `data/beijing-air-quality.csv`。校验失败会以非零退出码报错。
