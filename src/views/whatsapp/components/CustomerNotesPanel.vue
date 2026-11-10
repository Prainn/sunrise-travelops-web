<template>
  <h4 class="mt-[16px] mb-[8px] text-[14px] text-strong font-600">
    {{ $t("whatsapp.customerNotes") }}
  </h4>
  <div v-if="notes.loading.value" v-loading="true" class="h-[80px]" />
  <div v-else-if="!form" class="text-[12px] text-muted">
    {{ notes.error.value || $t("common.loadFailed") }}
    <el-button
      link
      type="primary"
      class="ml-[8px]"
      @click="emit('refresh')"
    >
      {{ $t("common.reload") }}
    </el-button>
  </div>
  <template v-else>
    <el-alert
      v-if="notes.entry.value?.conflict"
      type="warning"
      :closable="false"
      show-icon
      :title="$t('whatsapp.customerNotesConflict')"
      class="mb-[8px]!"
    />
    <el-form
      :model="form"
      label-position="top"
      size="small"
      :disabled="!editable || notes.saving.value"
    >
      <el-form-item :label="$t('common.countryOrRegion')">
        <BusinessItemSelect
          :model-value="form.countryItemId ?? ''"
          type-code="country-region"
          clearable
          @update:model-value="form.countryItemId = $event || null"
        />
      </el-form-item>
      <el-form-item :label="$t('websiteInquiry.customerName')">
        <el-input v-model="form.customerName" maxlength="100" />
      </el-form-item>
      <el-form-item :label="$t('inquiry.plannedDays')">
        <el-input-number
          v-model="form.plannedDays"
          :min="1"
          :max="365"
          :precision="0"
          :value-on-clear="null"
          controls-position="right"
          class="w-full!"
        />
      </el-form-item>
      <el-form-item :label="$t('common.startDate')">
        <el-date-picker
          v-model="form.startDate"
          value-format="YYYY-MM-DD"
          :value-on-clear="null"
          clearable
          class="w-full!"
        />
      </el-form-item>
      <el-form-item :label="$t('websiteInquiry.pax')">
        <el-input-number
          v-model="form.pax"
          :min="1"
          :max="10000"
          :precision="0"
          :value-on-clear="null"
          controls-position="right"
          class="w-full!"
        />
      </el-form-item>
      <el-form-item :label="$t('websiteInquiry.contactInfo')">
        <el-input v-model="form.contactInfo" maxlength="500" />
      </el-form-item>
      <el-form-item :label="$t('websiteInquiry.destinations')">
        <el-select
          v-model="form.destinations"
          autocomplete="new-password"
          multiple
          filterable
          :multiple-limit="365"
          class="w-full"
        >
          <el-option
            v-for="city in cities"
            :key="city.id"
            :value="city.id"
            :label="city.nameZh"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('inquiry.originalMessage')">
        <el-input
          v-model="form.requirements"
          type="textarea"
          :autosize="{ minRows: 3, maxRows: 10 }"
          maxlength="200000"
        />
      </el-form-item>
      <el-form-item :label="$t('inquiry.internalRemark')">
        <el-input
          v-model="form.internalRemark"
          type="textarea"
          :autosize="{ minRows: 2, maxRows: 8 }"
          maxlength="20000"
        />
      </el-form-item>
    </el-form>
    <div v-if="editable" class="flex flex-wrap gap-[8px]">
      <el-button
        type="primary"
        :loading="notes.saving.value"
        :disabled="!notes.dirty.value || notes.entry.value?.conflict"
        @click="emit('save')"
      >
        {{ $t("common.save") }}
      </el-button>
      <el-button :disabled="notes.saving.value" @click="emit('refresh')">
        {{ $t("common.refresh") }}
      </el-button>
    </div>
  </template>
</template>

<script setup lang="ts">
import { computed } from "vue";
import BusinessItemSelect from "@/components/BusinessItemSelect/index.vue";
import type { WebsiteCity } from "@/types/website";
import type { useCustomerNotes } from "../useCustomerNotes";

const props = defineProps<{
  /** 由工作台持有的按会话隔离的资料状态。 */
  notes: ReturnType<typeof useCustomerNotes>;
  /** 独立站配置中的启用城市。 */
  cities: WebsiteCity[];
  editable: boolean;
}>();
const emit = defineEmits<{
  save: [];
  refresh: [];
}>();

const form = computed(() => props.notes.entry.value?.form);
</script>
