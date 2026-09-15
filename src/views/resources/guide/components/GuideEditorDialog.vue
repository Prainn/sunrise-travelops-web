<template>
  <el-dialog
    :model-value="modelValue"
    :title="$t(isEditing ? 'guide.editPrice' : 'guide.createPrice')"
    width="460px"
    @close="emit('update:modelValue', false)"
  >
    <el-form label-position="top">
      <el-form-item :label="$t('identity.library')">
        <ResourceLibraryTag :library="form.library" />
      </el-form-item>
      <el-form-item :label="$t('guide.referenceDailyPrice')">
        <el-input-number
          v-model="form.dailyPrice"
          :min="0"
          :precision="2"
        />
      </el-form-item>
      <el-form-item :label="$t('planning.secondLanguage')">
        <el-select v-model="form.secondLanguage">
          <el-option
            v-for="item in GUIDE_LANGUAGE_OPTIONS"
            :key="item.value"
            :value="item.value"
            :label="$t(`planning.languages.${item.value}`)"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('planning.shopping')">
        <el-switch
          v-model="form.shopping"
          :active-text="$t('common.yes')"
          :inactive-text="$t('common.no')"
        />
      </el-form-item>
      <el-form-item :label="$t('common.status')">
        <el-select
          v-model="form.status"
          class="w-full"
        >
          <el-option
            :label="$t('common.enabled')"
            value="enabled"
          />
          <el-option
            :label="$t('common.disabled')"
            value="disabled"
          />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">
        {{ $t('common.cancel') }}
      </el-button><el-button
        type="primary"
        @click="emit('submit', { ...form })"
      >
        {{ $t('common.confirm') }}
      </el-button>
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import ResourceLibraryTag from "@/components/ResourceLibraryTag.vue";
import { reactive, watch } from 'vue';
import { GUIDE_LANGUAGE_OPTIONS, type GuideRecord } from '@/types/resource';
const props = defineProps<{ modelValue: boolean; record: GuideRecord; isEditing: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [boolean]; submit: [GuideRecord] }>();
const form = reactive({ ...props.record });
watch(() => [props.modelValue, props.record] as const, ([visible, record]) => { if (visible) Object.assign(form, record); });
</script>
