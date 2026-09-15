<template>
  <el-button
    v-has-perm="'inquiry:transfer'"
    link
    type="primary"
    @click="open"
  >
    {{ $t('identity.transfer') }}
  </el-button>
  <el-dialog
    v-model="visible"
    :title="$t('identity.transfer')"
    width="480px"
    append-to-body
  >
    <el-form
      ref="form"
      :model="data"
      label-position="top"
    >
      <el-form-item
        :label="$t('identity.owner')"
        prop="ownerId"
        :rules="{required:true,message:$t('common.selectPlaceholder')}"
      >
        <el-select
          v-model="data.ownerId"
          filterable
          :placeholder="$t('common.selectPlaceholder')"
        >
          <el-option
            v-for="person in owners.filter(p=>p.id!==inquiry.ownerId)"
            :key="person.id"
            :value="person.id"
            :label="`${person.name} (${person.username})`"
          />
        </el-select>
      </el-form-item>
      <el-form-item
        :label="$t('identity.reason')"
        prop="reason"
        :rules="{required:true,whitespace:true,message:$t('identity.reasonPlaceholder')}"
      >
        <el-input
          v-model="data.reason"
          type="textarea"
          :placeholder="$t('identity.reasonPlaceholder')"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible=false">
        {{ $t('common.cancel') }}
      </el-button><el-button
        type="primary"
        :loading="saving"
        @click="submit"
      >
        {{ $t('common.confirm') }}
      </el-button>
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import {ElMessage} from "element-plus";
import type { FormInstance } from 'element-plus';
import type { InquiryRecord } from '@/types/inquiry';
import { inquiryService, type PersonOption } from '@/services/inquiry.service';
const props=defineProps<{inquiry:InquiryRecord}>();
const emit=defineEmits<{transferred:[]}>();
const visible=ref(false),saving=ref(false),owners=ref<PersonOption[]>([]),form=ref<FormInstance>();
const data=reactive({ownerId:'',reason:''});
async function open() { try { owners.value=await inquiryService.owners(props.inquiry.businessUnit);data.ownerId='';data.reason='';visible.value=true; } catch(e) { ElMessage.error(e instanceof Error ? e.message : String(e)); } }
async function submit() { if (!await form.value?.validate().catch(()=>false)) return;saving.value=true;try { await inquiryService.transfer(props.inquiry,data.ownerId,data.reason);visible.value=false;emit('transferred'); } catch(e) { ElMessage.error(e instanceof Error ? e.message : String(e)); } finally {saving.value=false;} }
</script>
