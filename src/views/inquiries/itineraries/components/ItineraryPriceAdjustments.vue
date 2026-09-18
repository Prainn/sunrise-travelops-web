<template>
  <section class="mt-6">
    <h3>{{ $t('identity.prices') }}</h3>
    <el-card shadow="never">
      <el-form label-position="top">
        <div
          v-for="row in rows"
          :key="row.key"
          class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4"
        >
          <el-form-item :label="row.name + ' · ' + $t('identity.actual')">
            <el-input-number
              :model-value="row.get()"
              :min="0"
              :precision="2"
              :disabled="!editable"
              @change="changePrice(row, Number($event))"
            />
          </el-form-item>
          <el-form-item :label="$t('identity.reference')">
            <el-text>{{ row.fields.referencePrice == null ? $t(row.custom ? 'identity.noReference' : 'identity.unknown') : `¥${formatMoney(row.fields.referencePrice)}` }}</el-text>
          </el-form-item>
          <el-form-item
            :label="$t('identity.reason')"
            :required="row.fields.referencePrice != null && row.get() !== row.fields.referencePrice"
          >
            <el-input
              :model-value="row.fields.adjustmentReason ?? ''"
              :disabled="!editable"
              :placeholder="$t('identity.reasonPlaceholder')"
              @update:model-value="row.fields.adjustmentReason = $event; emit('change')"
            />
          </el-form-item>
        </div>
        <div
          v-for="vehicle in plan.vehiclePlans.filter(v => v.arrangements.length)"
          :key="vehicle.tier"
          class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4"
        >
          <el-form-item :label="$t(`inquiry.log.tiers.${vehicle.tier}`) + ' · ' + $t('identity.actual')">
            <el-input-number
              :model-value="vehicle.totalPrice"
              :min="0"
              :precision="2"
              :disabled="!editable"
              @change="vehicle.totalPrice=Number($event); vehicle.pricingMode='manual'; vehicle.adjustmentReason=''; emit('change')"
            />
          </el-form-item>
          <el-form-item :label="$t('identity.reference')">
            <el-button
              :disabled="!editable || calculateVehiclePlanAutomaticTotal(vehicle)==null"
              @click="vehicle.pricingMode='automatic';vehicle.totalPrice=calculateVehiclePlanAutomaticTotal(vehicle);vehicle.adjustmentReason='';emit('change')"
            >
              {{ $t('identity.automatic') }} · {{ calculateVehiclePlanAutomaticTotal(vehicle) ?? '—' }}
            </el-button>
          </el-form-item>
          <el-form-item
            :label="$t('identity.reason')"
            :required="vehicle.totalPrice !== calculateVehiclePlanAutomaticTotal(vehicle) || calculateVehiclePlanAutomaticTotal(vehicle)==null"
          >
            <el-input
              :model-value="vehicle.adjustmentReason ?? ''"
              :disabled="!editable"
              :placeholder="$t('identity.reasonPlaceholder')"
              @update:model-value="vehicle.adjustmentReason=$event;emit('change')"
            />
          </el-form-item>
        </div>
      </el-form>
      <el-collapse @change="loadHistory">
        <el-collapse-item
          :title="$t('identity.history')"
          name="history"
        >
          <el-table
            :data="history"
            size="small"
          >
            <el-table-column
              prop="itemName"
              :label="$t('identity.actual')"
            />
            <el-table-column :label="$t('identity.actual')">
              <template #default="{row}">
                {{ row.beforePrice ?? '—' }} → {{ row.afterPrice }}
              </template>
            </el-table-column>
            <el-table-column
              prop="reason"
              :label="$t('identity.reason')"
            />
            <el-table-column
              prop="operatorName"
              :label="$t('identity.operator')"
            />
            <el-table-column :label="$t('identity.time')">
              <template #default="{row}">
                {{ formatDateTime(row.occurredAt) }}
              </template>
            </el-table-column>
          </el-table>
        </el-collapse-item>
      </el-collapse>
    </el-card>
  </section>
</template>
<script setup lang="ts">
import {ElMessage} from "element-plus";
import type { ItineraryRecord, PriceAdjustment } from '@/types/itinerary';
import { itineraryPriceRows } from '../price-adjustments';
import { calculateVehiclePlanAutomaticTotal } from '../vehicle-plans';
import { inquiryService } from '@/services/inquiry.service';
import { formatMoney, formatDateTime } from '@/utils';
const props=defineProps<{plan:ItineraryRecord;editable:boolean}>();
const emit=defineEmits<{change:[]}>();
const rows=computed(()=>itineraryPriceRows(props.plan));
const history=ref<PriceAdjustment[]>([]);
function changePrice(row: ReturnType<typeof itineraryPriceRows>[number], value:number) { row.set(value);row.fields.adjustmentReason='';emit('change'); }
async function loadHistory() { try { history.value=await inquiryService.priceAdjustments(props.plan.id); } catch(error) { ElMessage.error(error instanceof Error ? error.message : String(error)); } }
watch(()=>props.plan.id,()=>{history.value=[];});
</script>
