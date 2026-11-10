<template>
  <div class="whatsapp-text whitespace-pre-wrap break-words">
    <template v-for="(block, index) in blocks" :key="index">
      <pre v-if="block.kind === 'code'" class="m-0 p-[8px] rounded-[6px] bg-[var(--el-fill-color)] whitespace-pre-wrap font-mono"><code v-text="block.code" /></pre>
      <component
        :is="block.kind === 'ordered' ? 'ol' : 'ul'"
        v-else-if="block.kind === 'ordered' || block.kind === 'unordered'"
        class="my-[4px] pl-[24px]"
        :class="block.kind === 'ordered' ? 'list-decimal' : 'list-disc'"
      >
        <li v-for="(line, item) in block.lines" :key="item" :value="block.numbers?.[item]">
          <InlineText :nodes="line" />
        </li>
      </component>
      <blockquote v-else-if="block.kind === 'quote'" class="m-0 my-[4px] pl-[10px] border-l-[3px] border-l-solid border-l-[var(--el-color-primary)] text-[var(--el-text-color-regular)]">
        <div v-for="(line, item) in block.lines" :key="item">
          <InlineText :nodes="line" />
        </div>
      </blockquote>
      <div v-else>
        <InlineText :nodes="block.lines[0] ?? []" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, h, type VNodeChild } from "vue";
import { parseMessageText, type InlineNode } from "../message-format";
import { emojiUrl, splitEmojis } from "../emoji";

const props = defineProps<{ text: string }>();
const blocks = computed(() => parseMessageText(props.text));

function InlineText({ nodes }: { nodes: InlineNode[] }): VNodeChild[] {
  return nodes.map((node) => typeof node === "string" ? splitEmojis(node).map(part => {
    const src = emojiUrl(part);
    return src ? h("img", { src, alt: part, class: "inline-block w-[1.2em] h-[1.2em] align-middle" }) : part;
  }) : h(node.tag,
    node.tag === "code" ? { class: "font-mono rounded-[3px] px-[3px] bg-[var(--el-fill-color)]" } : {},
    InlineText({ nodes: node.children })));
}
</script>
