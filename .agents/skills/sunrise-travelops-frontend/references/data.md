# 请求、类型与状态

请求或类型变更读 API Rules 与类型/API 约定；状态变更读 Store 或 Composables。业务字段以根 API 合同及真实调用链为准。

## API Rules

- `/api` 无 `/v1`；成功 `{ code: "SUCCESS", message, data }`，字段是 `message`。request 返回解包后的 data，204 返回 undefined；组件通过业务 service 调用，不重复包装响应。
- `src/types/common.ts` 的 `PageResult<T>` 为 `{ list, total, page, pageSize }`；列表项、详情和表单按各业务合同定义，非分页接口不强套分页。
- request 抛 `ApiError`，优先展示后端非空 `message`，无有效 message 时按错误码/HTTP 状态使用本地化兜底，错误码在 `src/api/error-code.ts`；页面/composable 负责适当提示，不把请求失败变成成功空数据。
- Bearer、401 合并刷新及单次重试由 request 处理；token 存取走 `utils/auth-storage.ts`，身份状态走 user store，不绕过现有认证层。
- 菜单/按钮使用现有路由权限、指令和业务 workflow；隐藏 UI 不能替代后端数据范围校验。
- 新增页面后，静态检查菜单图标是否已注册：路由 `meta.icon` 使用 `el-icon-*` 时，核对 `src/main.ts` 中对应图标的导入及 `routeIcons` 全局注册。此项只检查注册，不要求浏览器验证。

## 类型与 API 约定

### 公共类型与请求边界

`api/request.ts` 定义 ApiResponse/ApiErrorResponse，成功结构为 `{ code: "SUCCESS", message: string, data: T }`，request 方法返回解包后的 data；204 返回 undefined。使用 `/api` 基础路径，不加 `/v1`。

`types/common.ts` 定义 `BaseQueryParams { page, pageSize }`、`PageResult<T> { list, total, page, pageSize }` 和 OptionItem。业务字段以根 docs/api 和后端实际实现核对。

### 类型命名

| 语义 | 命名 |
|------|------|
| 列表项 | `UserItem` |
| 表单对象 | `UserForm` |
| 查询参数 | `UserQueryParams extends BaseQueryParams` |
| 详情 | `UserDetail` |
| 登录用户信息 | `UserInfo` |

### API 定义

业务服务采用 `services/*.service.ts` 导出的对象，通过现有 request.get/post/put/patch/delete 调用端点；前端领域类型放在 `src/types`。

```typescript
import { request } from "@/api/request";
import type { PageResult } from "@/types/common";
import type { InquiryRecord } from "@/types/inquiry";

export const inquiryService = {
  list(query: { page: number; pageSize: number; keyword?: string }) {
    return request.get<PageResult<InquiryRecord>>("/inquiries", { params: query });
  },
  detail(id: string) {
    return request.get<InquiryRecord>(`/inquiries/${encodeURIComponent(id)}`);
  },
};
```

请求方法、路径与业务服务名称遵循现有调用者，不从示例创建另一套 API 层。

## Store

Setup Store 写法，扁平目录（无 `modules/` 子目录）。组件外使用 `useXxxStoreHook()`。

```typescript
export const useUserStore = defineStore("user", () => {
  const userInfo = ref<UserInfo>({} as UserInfo);
  const isLoggedIn = computed(() => !!userInfo.value.username);
  async function login(payload: LoginRequest) { /* ... */ }
  return { userInfo, isLoggedIn, login };
});

// 组件外调用（路由守卫等）
export function useUserStoreHook() {
  return useUserStore(store);
}
```

## Composables

`use` 前缀 + camelCase。参数用 options 对象，返回响应式引用和方法，不需要外部修改的状态用 `readonly()` 包裹。
