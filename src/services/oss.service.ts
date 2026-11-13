import { LONG_REQUEST_TIMEOUT_MS, request } from "@/api/request";
import type { OssResource, OssResourceForm, OssResourcePage, OssResourceQueryParams } from "@/types/oss";

const BASE_URL = "/system/oss/resources";
const resourceUrl = (id: string) => `${BASE_URL}/${encodeURIComponent(id)}`;

/**
 * 生成单文件上传请求体；只含 file 字段，multipart 边界由浏览器设置。
 *
 * @param file - 已通过前端类型与大小校验的图片。
 * @returns 上传表单。
 */
export function imageFormData(file: File): FormData {
  const form = new FormData();
  form.append("file", file, file.name);
  return form;
}

/** 环境由服务端决定，前端不传环境、bucket 或对象路径。 */
export const ossService = {
  list(query: OssResourceQueryParams) {
    return request.get<OssResourcePage>(BASE_URL, { params: { ...query } });
  },
  detail(id: string) {
    return request.get<OssResource>(resourceUrl(id));
  },
  upload(file: File) {
    return request.post<OssResource>(BASE_URL, imageFormData(file), { timeoutMs: LONG_REQUEST_TIMEOUT_MS });
  },
  update(id: string, form: OssResourceForm) {
    return request.put<OssResource>(resourceUrl(id), form);
  },
  remove(id: string, version: number) {
    return request.delete<{ id: string; deleted: true }>(resourceUrl(id), { params: { version } });
  },
  /** 只重新归档失败的 WhatsApp 资源，不会重新给客户发送消息。 */
  retry(id: string, version: number) {
    return request.post<OssResource>(`${resourceUrl(id)}/retry`, { version });
  },
};
