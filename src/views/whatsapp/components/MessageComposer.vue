<template>
  <div class="flex flex-col gap-[6px]">
    <div class="flex items-center gap-[4px]" role="toolbar" :aria-label="$t('whatsapp.formatting.label')">
      <el-popover
        v-model:visible="emojiOpen"
        trigger="click"
        placement="top-start"
        :width="288"
      >
        <template #reference>
          <button
            type="button"
            class="whatsapp-composer__tool"
            :disabled="disabled"
            :aria-label="$t('whatsapp.emoji')"
            :title="$t('whatsapp.emoji')"
            @mousedown.prevent="rememberSelection"
          >
            <span class="text-[18px] leading-none" aria-hidden="true">😀</span>
          </button>
        </template>
        <div class="grid grid-cols-8 gap-[5px]" :aria-label="$t('whatsapp.emoji')">
          <button
            v-for="emoji in COMMON_EMOJIS"
            :key="emoji"
            type="button"
            class="grid place-items-center p-0 w-[30px] h-[30px] border-0 rounded-[4px] bg-transparent text-[22px] leading-none cursor-pointer hover:bg-[var(--el-fill-color)]"
            :aria-label="emoji"
            @mousedown.prevent
            @click="insertEmoji(emoji)"
          >
            {{ emoji }}
          </button>
        </div>
      </el-popover>
      <button
        v-for="format in ['bold', 'italic'] as const"
        :key="format"
        type="button"
        class="whatsapp-composer__tool"
        :class="{ 'is-active': formats[format] }"
        :disabled="disabled"
        :aria-pressed="formats[format]"
        :aria-label="$t(`whatsapp.formatting.${format}`)"
        :title="$t(`whatsapp.formatting.${format}`)"
        @mousedown.prevent
        @click="toggleFormat(format)"
      >
        <span :class="format === 'bold' ? 'font-bold' : 'italic font-serif'">{{ format === 'bold' ? 'B' : 'I' }}</span>
      </button>
      <button
        type="button"
        class="whatsapp-composer__tool"
        :disabled="disabled"
        :aria-label="$t('whatsapp.quickReply')"
        :title="$t('whatsapp.quickReply')"
        @mousedown.prevent="rememberSelection"
        @click="quickReplyOpen = true"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linejoin="round"
          aria-hidden="true"
        ><path d="M20 4H4v13h4v4l5-4h7V4Z" /><path d="M7 8h10M7 12h7" /></svg>
      </button>
      <button
        type="button"
        class="whatsapp-composer__tool"
        :disabled="!canAttachImage || imageFull"
        :aria-label="$t('whatsapp.imageDraft.add')"
        :title="$t('whatsapp.imageDraft.add')"
        @click="pickImage"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linejoin="round"
          aria-hidden="true"
        ><rect
          x="3"
          y="5"
          width="18"
          height="14"
          rx="2"
        /><circle cx="9" cy="10" r="1.6" /><path d="m4 18 5-5 4 4 3-3 4 4" /></svg>
      </button>
      <input
        ref="fileInput"
        type="file"
        class="hidden"
        :accept="IMAGE_ACCEPT"
        multiple
        @change="handleFileChange"
      />
    </div>
    <div class="whatsapp-composer__box" :class="{ 'is-disabled': disabled }">
      <div v-if="$slots.attachments" class="px-[10px] pt-[10px]">
        <slot name="attachments" />
      </div>
      <div
        ref="editor"
        class="whatsapp-composer__editor"
        role="textbox"
        :contenteditable="!disabled"
        aria-multiline="true"
        :aria-disabled="disabled"
        :aria-label="$t('whatsapp.composerPlaceholder')"
        :data-placeholder="$t('whatsapp.composerPlaceholder')"
        :data-empty="!modelValue"
        @input="handleInput"
        @compositionstart="composing = true"
        @compositionend="composing = false; handleInput()"
        @mouseup="rememberSelection"
        @keyup="rememberSelection"
        @blur="rememberSelection"
        @keydown="handleKeydown"
        @paste.prevent="handlePaste"
        @drop.prevent
      />
      <span
        class="absolute right-[8px] bottom-[5px] text-[12px] pointer-events-none"
        :class="modelValue.length > maxLength ? 'text-[var(--el-color-danger)]' : 'text-faint'"
      >{{ modelValue.length }} / {{ maxLength }}</span>
    </div>
    <p v-if="unseparated" class="m-0 text-[12px] leading-[18px] text-[var(--el-color-warning)]" role="status">
      {{ $t("whatsapp.formatting.needsSeparator") }}
    </p>
    <QuickReplyDialog v-model="quickReplyOpen" @insert="insertText" />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { useI18n } from "vue-i18n";
import { COMMON_EMOJIS } from "../emoji";
import { composerContent, composerFragment } from "../composer-dom";
import { IMAGE_ACCEPT, namedClipboardImage } from "@/utils/image-file";
import { isCjk, isWord } from "../message-format";
import QuickReplyDialog from "./QuickReplyDialog.vue";

const props = withDefaults(defineProps<{
  modelValue: string;
  disabled: boolean;
  /** 可选图或粘贴图片生成草稿；发送仍由父组件点击“发送”触发。 */
  canAttachImage?: boolean;
  /** 草稿图片已达上限，不再打开选择框。 */
  imageFull?: boolean;
}>(), { canAttachImage: false, imageFull: false });
const emit = defineEmits<{ "update:modelValue": [text: string]; send: []; images: [files: File[]] }>();
const maxLength = 4096;
const { t } = useI18n();
const editor = ref<HTMLElement>();
const fileInput = ref<HTMLInputElement>();
const formats = reactive({ bold: false, italic: false });
const emojiOpen = ref(false);
const quickReplyOpen = ref(false);
const composing = ref(false);
/** 格式与相邻文字之间缺少空格或标点，WhatsApp 不会显示该格式。 */
const unseparated = ref(false);
let savedRange: Range | undefined;
let lastValue = props.modelValue;

function rememberSelection() {
  const selection = window.getSelection();
  if (!selection?.rangeCount || !editor.value?.contains(selection.anchorNode)) return;
  savedRange = selection.getRangeAt(0).cloneRange();
  formats.bold = document.queryCommandState("bold");
  formats.italic = document.queryCommandState("italic");
}
function focus() {
  const el = editor.value;
  if (!el) return;
  const selection = window.getSelection();
  if (!selection) return;
  // 光标仍在编辑器内时不重设选区，否则浏览器会丢掉已开启但尚未输入的粗体/斜体。
  if (document.activeElement === el && selection.rangeCount && el.contains(selection.anchorNode)) return;
  el.focus();
  const range = savedRange && el.contains(savedRange.commonAncestorContainer) ? savedRange : document.createRange();
  if (range !== savedRange) { range.selectNodeContents(el); range.collapse(false); }
  selection.removeAllRanges(); selection.addRange(range);
}
/** 连续汉字不是单词，按选中范围保留。 */
const isSnapWord = (char: string) => isWord(char) && !isCjk(char);
/** WhatsApp 只能整词加格式，选中部分拉丁单词时先扩展到单词边界，使编辑器显示与发送一致。 */
function snapSelectionToWords() {
  const selection = window.getSelection();
  if (!selection?.rangeCount || selection.isCollapsed) return;
  const range = selection.getRangeAt(0);
  const { startContainer, endContainer } = range;
  let { startOffset, endOffset } = range;
  const startText = startContainer.nodeType === 3 ? startContainer.nodeValue ?? "" : "";
  if (isSnapWord(startText[startOffset] ?? "")) while (startOffset > 0 && isSnapWord(startText[startOffset - 1]!)) startOffset--;
  const endText = endContainer.nodeType === 3 ? endContainer.nodeValue ?? "" : "";
  if (isSnapWord(endText[endOffset - 1] ?? "")) while (endOffset < endText.length && isSnapWord(endText[endOffset]!)) endOffset++;
  if (startOffset === range.startOffset && endOffset === range.endOffset) return;
  range.setStart(startContainer, startOffset); range.setEnd(endContainer, endOffset);
  selection.removeAllRanges(); selection.addRange(range);
}
function toggleFormat(format: "bold" | "italic") {
  if (props.disabled) return;
  focus(); snapSelectionToWords(); document.execCommand(format); rememberSelection(); handleInput();
}
function handleInput() {
  if (composing.value || !editor.value) return;
  const { text, unseparated: gap } = composerContent(editor.value);
  if (text.length > 4096) {
    editor.value.replaceChildren(composerFragment(lastValue)); savedRange = undefined; focus();
    ElMessage.warning(t("whatsapp.formatting.tooLong", { max: 4096 })); return;
  }
  lastValue = text; unseparated.value = gap; emit("update:modelValue", text); rememberSelection();
}
function insertText(text: string) {
  if (props.disabled) return;
  focus();
  const safe = document.createElement("div"); safe.append(composerFragment(text));
  document.execCommand("insertHTML", false, safe.innerHTML); handleInput();
}
function insertEmoji(emoji: string) { insertText(emoji); emojiOpen.value = false; }
/** 剪贴板含图片时按顺序追加到图片草稿，不改动文字；普通文本保持原行为。 */
function handlePaste(event: ClipboardEvent) {
  if (props.disabled) return;
  const images = [...event.clipboardData?.files ?? []].filter((file) => file.type.startsWith("image/"));
  if (images.length && props.canAttachImage) { emit("images", images.map(namedClipboardImage)); return; }
  document.execCommand("insertText", false, event.clipboardData?.getData("text/plain") ?? ""); handleInput();
}
function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = [...input.files ?? []];
  // 清空以便再次选择同一文件。
  input.value = "";
  if (files.length && props.canAttachImage) emit("images", files);
}
function handleKeydown(event: KeyboardEvent) {
  if (event.isComposing) return;
  if (event.ctrlKey || event.metaKey) {
    if (event.key === "Enter") { event.preventDefault(); emit("send"); }
    else if (["b", "i"].includes(event.key.toLowerCase())) { event.preventDefault(); toggleFormat(event.key.toLowerCase() === "b" ? "bold" : "italic"); }
  }
}
watch(() => props.modelValue, (text) => {
  if (text === lastValue || !editor.value) return;
  editor.value.replaceChildren(composerFragment(text)); lastValue = text; savedRange = undefined;
  // 外部正文按 WhatsApp 规则解析，只会生成可识别的格式。
  unseparated.value = false;
  if (!text) { formats.bold = false; formats.italic = false; }
});
onMounted(() => {
  editor.value?.replaceChildren(composerFragment(props.modelValue));
  document.addEventListener("selectionchange", rememberSelection);
});
onBeforeUnmount(() => document.removeEventListener("selectionchange", rememberSelection));
function pickImage() {
  if (props.canAttachImage && !props.imageFull) fileInput.value?.click();
}
defineExpose({ focus, pickImage });
</script>

<style scoped lang="scss">
.whatsapp-composer__tool {
  @apply grid place-items-center box-border w-[36px] h-[30px] p-0 rounded-[5px] border-solid border-[1px] border-[var(--el-border-color)] bg-[var(--el-bg-color)] text-[14px] text-[var(--el-text-color-regular)] cursor-pointer;
  &:hover, &.is-active { border-color: var(--el-color-primary); color: var(--el-color-primary); background: var(--el-color-primary-light-9); }
  &:disabled { opacity: .4; cursor: not-allowed; }
  &:focus-visible { outline: 2px solid var(--el-color-primary); }
}
// 图片草稿与文字共用一个输入框，边框和聚焦状态由外层承载。
.whatsapp-composer__box {
  @apply relative box-border rounded-[8px] border-solid border-[1px] border-[var(--el-border-color)] bg-[var(--el-bg-color)];
  &:focus-within { border-color: var(--el-color-primary); }
  &.is-disabled { background: var(--el-disabled-bg-color); }
}
.whatsapp-composer__editor {
  @apply box-border relative min-h-[84px] max-h-[180px] overflow-y-auto px-[10px] pt-[7px] pb-[24px] whitespace-pre-wrap break-words text-[14px] leading-[22px];
  &:focus { outline: none; }
  &[aria-disabled="true"] { color: var(--el-disabled-text-color); }
  &[data-empty="true"]::before { content: attr(data-placeholder); position: absolute; pointer-events: none; color: var(--el-text-color-placeholder); font-weight: normal; font-style: normal; }
}
</style>
