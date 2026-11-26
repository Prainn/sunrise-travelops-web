<!-- 文档预览弹窗：PDF 用浏览器内置阅读器，DOCX 在页面内排版；DOC 等格式只提示下载，点击“下载”才下载 -->
<template>
  <AppDialog
    v-model="open"
    size="xl"
    :title="document?.fileName"
    append-to-body
    close-on-click-modal
    @closed="clear"
  >
    <div class="document-preview" :aria-busy="state === 'loading'">
      <iframe
        v-if="state === 'ready' && pdfUrl"
        class="document-preview__frame"
        :src="pdfUrl"
        :title="document?.fileName"
      />
      <div v-show="state === 'ready' && !pdfUrl" ref="docxRef" class="document-preview__docx" />
      <div
        v-if="state === 'loading'"
        v-loading="true"
        class="document-preview__state"
        :element-loading-text="$t('whatsapp.documentPreview.loading')"
      />
      <FeedbackState
        v-else-if="state === 'unsupported'"
        class="document-preview__state"
        :title="$t('whatsapp.documentPreview.unsupportedTitle')"
        :description="$t('whatsapp.documentPreview.unsupported')"
      />
      <FeedbackState
        v-else-if="state === 'error'"
        class="document-preview__state"
        type="error"
        :description="errorMessage"
      />
    </div>
    <template #footer>
      <el-button @click="open = false">
        {{ $t("common.cancel") }}
      </el-button>
      <el-button type="primary" :loading="downloadingIds.has(messageId)" @click="handleDownload">
        {{ $t("whatsapp.documentPreview.download") }}
      </el-button>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { useI18n } from "vue-i18n";
import AppDialog from "@/components/AppDialog/index.vue";
import FeedbackState from "@/components/FeedbackState/index.vue";
import { websiteErrorMessage } from "@/services/website.service";
import { whatsappService } from "@/services/whatsapp.service";
import type { WhatsappDocumentMeta } from "@/types/whatsapp";
import { recordClientOperation } from "@/utils/client-operation-log";
import { documentPreviewType } from "../message-utils";

type PreviewState = "idle" | "loading" | "ready" | "unsupported" | "error";

const props = defineProps<{
  conversationId: string;
  messageId: string;
  document?: Pick<WhatsappDocumentMeta, "fileName" | "mimeType">;
}>();
const open = defineModel<boolean>({ required: true });

const { t } = useI18n();
const state = ref<PreviewState>("idle");
const downloadingIds = ref(new Set<string>());
const errorMessage = ref("");
const pdfUrl = ref("");
const docxRef = ref<HTMLElement>();
let controller: AbortController | undefined;

watch(open, (value) => {
  if (value) void load();
  else {
    controller?.abort();
  }
}, { immediate: true });
onBeforeUnmount(clear);

/** 按文件头核对实际格式，元数据与内容不符时不渲染。 */
async function hasSignature(blob: Blob, type: "pdf" | "docx"): Promise<boolean> {
  const head = new Uint8Array(await blob.slice(0, 5).arrayBuffer());
  const expected = type === "pdf" ? [0x25, 0x50, 0x44, 0x46, 0x2d] : [0x50, 0x4b, 0x03, 0x04];
  return expected.every((byte, index) => head[index] === byte);
}

/** 文档中的链接只保留网页和邮件地址，并在新窗口打开。 */
function sanitizeLinks(container: HTMLElement) {
  for (const link of container.querySelectorAll("a[href]")) {
    const href = link.getAttribute("href") ?? "";
    if (/^(https?:|mailto:)/i.test(href)) {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    } else if (!href.startsWith("#")) {
      link.removeAttribute("href");
    }
  }
}

async function renderDocx(blob: Blob, container: HTMLElement) {
  const { renderAsync } = await import("docx-preview");
  await renderAsync(blob, container, undefined, {
    className: "docx",
    ignoreLastRenderedPageBreak: true,
    useBase64URL: true,
    // altChunk 可内嵌 HTML，客户文件不可信，不渲染。
    renderAltChunks: false,
    renderComments: false,
  });
  sanitizeLinks(container);
}

async function load() {
  clear();
  const document = props.document;
  const type = document && documentPreviewType(document);
  if (!type) {
    state.value = "unsupported";
    return;
  }
  const current = new AbortController();
  controller = current;
  state.value = "loading";
  try {
    const blob = await whatsappService.documentPreview(props.conversationId, props.messageId, current.signal);
    if (current.signal.aborted) return;
    if (!(await hasSignature(blob, type))) {
      errorMessage.value = t("whatsapp.documentPreview.invalid");
      state.value = "error";
      recordClientOperation({
        action: "preview",
        result: "failure",
        recordId: props.messageId,
        value: type === "pdf" ? "pdf" : "word",
      });
      return;
    }
    if (type === "pdf") {
      // 以本地确认过的 PDF 类型重新封装，避免浏览器按其他类型解析。
      pdfUrl.value = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
    } else {
      state.value = "ready";
      await nextTick();
      if (current.signal.aborted || !docxRef.value) return;
      await renderDocx(blob, docxRef.value);
    }
    if (!current.signal.aborted) {
      state.value = "ready";
      recordClientOperation({
        action: "preview",
        result: "success",
        recordId: props.messageId,
        value: type === "pdf" ? "pdf" : "word",
      });
    }
  } catch (cause) {
    if (current.signal.aborted) return;
    errorMessage.value = websiteErrorMessage(cause);
    state.value = "error";
    recordClientOperation({
      action: "preview",
      result: "failure",
      recordId: props.messageId,
      value: type === "pdf" ? "pdf" : "word",
    });
  }
}

/** 取消未完成的请求并释放已加载的文件内容。 */
function clear() {
  controller?.abort();
  controller = undefined;
  if (pdfUrl.value) URL.revokeObjectURL(pdfUrl.value);
  pdfUrl.value = "";
  docxRef.value?.replaceChildren();
  errorMessage.value = "";
  state.value = "idle";
}

/** 每次点击重新获取 60 秒下载地址并立即触发下载；地址不缓存、不展示。 */
async function handleDownload() {
  const { conversationId, messageId } = props;
  if (downloadingIds.value.has(messageId)) return;
  downloadingIds.value = new Set(downloadingIds.value).add(messageId);
  try {
    const { url } = await whatsappService.documentDownload(conversationId, messageId);
    // 签名地址强制 attachment；在隐藏 iframe 中打开，避免整页导航触发离开确认。
    const frame = document.createElement("iframe");
    frame.hidden = true;
    frame.referrerPolicy = "no-referrer";
    frame.src = url;
    document.body.append(frame);
    // 过早移除会中断下载，保留到签名地址失效。
    setTimeout(() => frame.remove(), 60_000);
    recordClientOperation({
      action: "download",
      result: "unknown",
      recordId: messageId,
    });
  } catch (cause) {
    recordClientOperation({
      action: "download",
      result: "failure",
      recordId: messageId,
    });
    ElMessage.error(websiteErrorMessage(cause));
  } finally {
    const next = new Set(downloadingIds.value);
    next.delete(messageId);
    downloadingIds.value = next;
  }
}
</script>

<style scoped lang="scss">
.document-preview {
  position: relative;
  height: 70vh;
  overflow: hidden;
  border-radius: 4px;
  background: var(--el-fill-color-light);

  &__frame {
    width: 100%;
    height: 100%;
    border: 0;
  }

  &__docx {
    height: 100%;
    overflow: auto;
  }

  &__state {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
</style>
