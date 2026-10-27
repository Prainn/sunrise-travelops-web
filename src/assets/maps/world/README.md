# 世界航班地图底图素材

`world.geo.json` 是可直接导入的 GeoJSON FeatureCollection，239个国家/地区要素，约301 KiB（原始文件308216字节）。保留上游原始属性与几何，不新增运行时依赖，不在用户浏览时连接外部地图服务。

## 素材更新

上游文件：[world.json](https://github.com/JayMuShui/chinese-global-compliant-geodata/blob/3cf3485789876c37be6193bf2848cf9aaa40f758/src/geojson/globe/world.json)，固定版本 `3cf3485789876c37be6193bf2848cf9aaa40f758`。替换素材时同步保留同目录 `LICENSE-MIT.txt` 和 `LICENSE-Unlicense.txt`。

## 几何结构

- 只有一个 `iso_a3=CHN` 的“中国/中华人民共和国” MultiPolygon 要素，没有单列 `TWN/HKG/MAC` 国家/地区要素。
- 台湾岛属于同一个中国几何。台北示例坐标 `[121.5654,25.033]` 位于中国要素内，海南及达旺示例点也位于该要素内。
- 中国共23个多边形部分，包含台湾、海南、东海/南海岛屿与十段断续线的多边形表达。十段线位于中国要素后10个 polygon（索引13–22），必须完整保留，不能按面积过滤或只取最大陆地面。

## 前端接入约定

- 使用 `import('@/assets/maps/world/world.geo.json')` 按需加载；GeoJSON 经纬度采用 `[longitude, latitude]`，与航班接口 WGS84 点位共用同一投影。地图对象只注册/解析一次，不在动画帧中重建。
- 每个 feature 的 `properties.name/full_name/iso_a2/iso_a3/iso_n3` 可用于标识；中国各部分必须同色、同高亮、同点击归属，不能把台湾/港澳生成独立国家图例、边界或标签。
- 不使用普通 Natural Earth 默认国家版替换本素材，不仅修改标签冒充几何归属修正。先前取得的纯陆地候选已删除，不作为自动 fallback。
- 保留中国所有 multipart 几何及十段线。断续线在源数据中为窄多边形，不能误当作岛屿去掉或将其间海域填成整片陆地；缩放/聚焦不能只按最大陆地面裁切。
- 机场坐标直接取 `/api/dashboard/flight-map` 返回的两端机场，不在浏览器加载全球机场库或另一套坐标目录。当前后端目录覆盖28个机场，未知机场按接口进入待定位。
- 本素材面向全球航线示意，边界已由上游概化，不用于城市/街道级展示。运行时由首页 `OperationsMap` 下的 `flight-map` 组件消费，静态 ECharts 底图与 Canvas 航线动画共用投影。
