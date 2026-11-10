<template>
  <AppDialog
    v-model="visible"
    :title="$t('whatsapp.quickReply')"
    @open="loadStages"
    @closed="reset"
  >
    <FeedbackState
      v-if="error"
      type="error"
      :description="error"
      retryable
      @retry="loadStages"
    />
    <el-form v-else v-loading="loading" label-position="top">
      <el-form-item :label="$t('whatsapp.quickReplies.stage')">
        <el-select
          v-model="stage"
          autocomplete="new-password"
          :placeholder="$t('common.selectPlaceholder')"
          class="w-full"
          @change="loadScenarios"
        >
          <el-option
            v-for="item in stages"
            :key="item"
            :label="item"
            :value="item"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('whatsapp.quickReplies.scenario')">
        <el-select
          v-model="scenario"
          autocomplete="new-password"
          :disabled="!stage"
          :placeholder="$t('common.selectPlaceholder')"
          class="w-full"
          @change="loadContent"
        >
          <el-option
            v-for="item in scenarios"
            :key="item"
            :label="item"
            :value="item"
          />
        </el-select>
      </el-form-item>
      <div v-if="content" class="p-[12px] rounded-[6px] bg-[var(--el-fill-color-light)] max-h-[280px] overflow-y-auto">
        <MessageText :text="content" />
      </div>
      <FeedbackState v-else-if="!loading" :title="$t(stages.length ? 'whatsapp.quickReplies.chooseScenario' : 'whatsapp.quickReplies.empty')" />
    </el-form>
    <template #footer>
      <el-button @click="visible = false">
        {{ $t('common.cancel') }}
      </el-button>
      <el-button type="primary" :disabled="!content || loading || !!error" @click="insert">
        {{ $t('whatsapp.quickReplies.insert') }}
      </el-button>
    </template>
  </AppDialog>
</template>
<script setup lang="ts">
import { ref } from "vue";
import AppDialog from "@/components/AppDialog/index.vue";
import FeedbackState from "@/components/FeedbackState/index.vue";
import { whatsappService } from "@/services/whatsapp.service";
import { websiteErrorMessage } from "@/services/website.service";
import MessageText from "./MessageText.vue";
const visible = defineModel<boolean>({ required: true });
const emit = defineEmits<{ insert: [text: string] }>();
const stages = ref<string[]>([]), scenarios = ref<string[]>([]);
const stage = ref(""), scenario = ref(""), content = ref("");
const loading = ref(false), error = ref("");
let generation = 0;
function reset() { generation++; stage.value = ""; scenario.value = ""; content.value = ""; error.value = ""; }
async function loadStages() {
  const current = ++generation; loading.value = true; error.value = "";
  try { const result = await whatsappService.quickReplyOptions(); if (current === generation) stages.value = result.stages; }
  catch (cause) { if (current === generation) error.value = websiteErrorMessage(cause); }
  finally { if (current === generation) loading.value = false; }
}
async function loadScenarios() {
  const current = ++generation; scenario.value = ""; content.value = ""; scenarios.value = []; loading.value = true;
  try { const result = await whatsappService.quickReplyOptions(stage.value); if (current === generation) scenarios.value = result.scenarios; }
  catch (cause) { if (current === generation) error.value = websiteErrorMessage(cause); }
  finally { if (current === generation) loading.value = false; }
}
async function loadContent() {
  const current = ++generation; content.value = ""; loading.value = true;
  try { const result = await whatsappService.quickReplies({ page: 1, pageSize: 1, stage: stage.value, scenario: scenario.value, status: "enabled" }); if (current === generation) content.value = result.list[0]?.content ?? ""; }
  catch (cause) { if (current === generation) error.value = websiteErrorMessage(cause); }
  finally { if (current === generation) loading.value = false; }
}
function insert() { if (!content.value) return; emit("insert", content.value); visible.value = false; }
</script>
