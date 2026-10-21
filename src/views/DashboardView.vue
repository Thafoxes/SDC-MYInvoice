<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { DollarSign, Clock, AlertTriangle, Calendar, Search, Eye, ChevronLeft, ChevronRight } from 'lucide-vue-next';
import { Doughnut, Line } from 'vue-chartjs';
import { Chart as ChartJS, ArcElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler } from 'chart.js';
import StatusBadge from '@/components/StatusBadge.vue';
import InvoiceDetailDrawer from '@/components/InvoiceDetailDrawer.vue';
import { useDemoStore } from '@/composables/useDemoStore';
import { DEMO_BUSINESS_ID, computeInvoiceWithCustomer } from '@/lib/store';
import { calculateCustomerPriorities } from '@/lib/priorityEngine';
import type { CustomerPriority, PriorityLevel } from '@/lib/priorityEngine';
import { formatMYR, formatDate, sumMoney, daysOverdue } from '@/lib/format';
import type { InvoiceWithCustomer } from '@/types';
ChartJS.register(ArcElement,LineElement,PointElement,CategoryScale,LinearScale,Tooltip,Legend,Filler);
const {data}=useDemoStore();
const seller=computed(()=>data.value.users.find(u=>u.id==='user-seller') ?? data.value.users[0]);
const today=computed(()=>data.value.demoState.simulated_date);
const invoices=computed(()=>data.value.invoices.filter(i=>i.business_id===DEMO_BUSINESS_ID).map(i=>computeInvoiceWithCustomer(i,data.value,today.value)));
const priorityRecords=computed(()=>calculateCustomerPriorities(DEMO_BUSINESS_ID,today.value,data.value));
const expandedPriority=ref<string|null>(null);
const priorityList=computed(()=>[...priorityRecords.value].sort((a,b)=>{
 const rank:Record<PriorityLevel,number>={red:0,yellow:1,grey:2,green:3};
 return rank[a.level]-rank[b.level] || a.customerName.localeCompare(b.customerName);
}));
function priorityBadge(level:PriorityLevel){
 return {red:'bg-red-50 text-red-700 border-red-100',yellow:'bg-amber-50 text-amber-700 border-amber-100',green:'bg-green-50 text-green-700 border-green-100',grey:'bg-slate-50 text-slate-600 border-slate-200'}[level];
}
function priorityInvoiceRefs(priority:CustomerPriority){
 return priority.supportingInvoiceIds.map(id=>data.value.invoices.find(i=>i.id===id)?.invoice_number ?? id).join(', ') || 'None';
}
const dateFilterOptions=['today','week','month','custom'] as const;
const dateFilter=ref<'today'|'week'|'month'|'custom'>('week'),customStart=ref('2026-10-01'),customEnd=ref('2026-10-20');
const search=ref(''), statusFilter=ref('all'),sortBy=ref<'dueDate'|'outstanding'>('dueDate'),currentPage=ref(0), pageSize=8;
const selectedId=ref<string|null>(null),drawerOpen=ref(false);
const selected=computed(()=>invoices.value.find(i=>i.id===selectedId.value)??null);
function periodBounds(){const d=new Date(today.value+'T12:00:00');if(dateFilter.value==='today')return {start:today.value,end:today.value};if(dateFilter.value==='custom')return{start:customStart.value,end:customEnd.value};if(dateFilter.value==='month')return{start:today.value.slice(0,8)+'01',end:today.value};const day=d.getDay();d.setDate(d.getDate()-day);return{start:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,end:today.value};}
const collected=computed(()=>{const p=periodBounds();return sumMoney(data.value.payments.filter(x=>x.business_id===DEMO_BUSINESS_ID && x.payment_date>=p.start && x.payment_date<=p.end && x.verification_status==='recorded').map(x=>x.amount));});
const totalOutstanding=computed(()=>sumMoney(invoices.value.map(i=>i.outstanding_balance)));
const overdueInvoices=computed(()=>invoices.value.filter(i=>i.status==='overdue'));
const overdueAmount=computed(()=>sumMoney(overdueInvoices.value.map(i=>i.outstanding_balance)));
const pendingCount=computed(()=>invoices.value.filter(i=>i.status==='pending').length);
const summary=computed(()=>[
 {label:'Total Collected',value:formatMYR(collected.value),note:'Selected reporting period',icon:DollarSign,color:'#16A34A'},
 {label:'Total Outstanding',value:formatMYR(totalOutstanding.value),note:'Current snapshot',icon:Clock,color:'#F59E0B'},
 {label:'Overdue Amount',value:formatMYR(overdueAmount.value),note:'Current snapshot',icon:AlertTriangle,color:'#EF4444'},
]);
interface PriorityItem {id:string;customer:string;number:string;issue:string;priority:'High'|'Medium'|'Low';action:string}
const priorityActions=computed<PriorityItem[]>(()=>{const result:PriorityItem[]=[];for(const i of overdueInvoices.value){
 const pending=data.value.followUpActions.some(f=>f.invoice_id===i.id&&f.approval_state==='pending');
 if(i.dispute_active)result.push({id:i.id,customer:i.customer?.name??'—',number:i.invoice_number,issue:'Invoice disputed',priority:'High',action:'Review dispute'});
 if(i.verification_hold)result.push({id:i.id,customer:i.customer?.name??'—',number:i.invoice_number,issue:'Payment claim awaiting verification',priority:'High',action:'Verify payment'});
 if(pending)result.push({id:i.id,customer:i.customer?.name??'—',number:i.invoice_number,issue:'Reminder awaiting approval',priority:'Medium',action:'Review approval'});
 if(!i.dispute_active&&!i.verification_hold&&!pending)result.push({id:i.id,customer:i.customer?.name??'—',number:i.invoice_number,issue:`${i.days_overdue} days overdue`,priority:i.days_overdue>=21?'High':i.days_overdue>=7?'Medium':'Low',action:i.days_overdue>=21?'Escalate decision':'Review follow-up'});
 }return result.slice(0,8);});
const statusChart=computed(()=>({labels:['Paid','Pending','Overdue'],datasets:[{data:[invoices.value.filter(i=>i.status==='paid').length,pendingCount.value,overdueInvoices.value.length],backgroundColor:['#16A34A','#F59E0B','#EF4444'],borderWidth:0,spacing:2}]}));
const trendChart=computed(()=>{const map=new Map<string,number>();data.value.payments.filter(p=>p.business_id===DEMO_BUSINESS_ID && p.verification_status==='recorded').forEach(p=>map.set(p.payment_date,(map.get(p.payment_date)||0)+p.amount));const a=[...map.entries()].sort((x,y)=>x[0].localeCompare(y[0]));return{labels:a.map(x=>x[0].slice(5)),datasets:[{label:'Recorded payments (RM)',data:a.map(x=>x[1]),borderColor:'#4096EE',backgroundColor:'rgba(64,150,238,.12)',pointBackgroundColor:'#1D72E0',fill:true,tension:.35}]};});
const chartOptions={responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom' as const}}};
const aging=computed(()=>[{label:'1–7 days',min:1,max:7},{label:'8–14 days',min:8,max:14},{label:'15–21 days',min:15,max:21},{label:'More than 21 days',min:22,max:9999}].map(b=>{const matched=overdueInvoices.value.filter(i=>{const d=daysOverdue(i.due_date,today.value);return d>=b.min&&d<=b.max;});return{label:b.label,count:matched.length,amount:sumMoney(matched.map(i=>i.outstanding_balance))};}));
const filtered=computed(()=>invoices.value.filter(i=>(statusFilter.value==='all'||i.status===statusFilter.value)&&(i.invoice_number.toLowerCase().includes(search.value.toLowerCase())||i.customer?.name.toLowerCase().includes(search.value.toLowerCase()))).sort((a,b)=>sortBy.value==='dueDate'?a.due_date.localeCompare(b.due_date):b.outstanding_balance-a.outstanding_balance));
const pages=computed(()=>Math.max(1,Math.ceil(filtered.value.length/pageSize)));
const pageData=computed(()=>filtered.value.slice(Math.min(currentPage.value,pages.value-1)*pageSize,(Math.min(currentPage.value,pages.value-1)+1)*pageSize));
watch([search,statusFilter],()=>currentPage.value=0);
function openInvoice(i:InvoiceWithCustomer){selectedId.value=i.id;drawerOpen.value=true;}
</script>
<template>
<div class="space-y-6">
 <div class="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end"><div><h2 class="text-lg font-semibold">Collection summary</h2><p class="text-xs text-orbyte-muted mt-1">Choose a period for collected payments. Balances show the current snapshot.</p></div>
   <div class="flex flex-wrap items-center gap-1 rounded-xl border border-orbyte-border bg-white p-1 shadow-sm"><Calendar class="w-4 h-4 text-orbyte-muted ml-2"/><button v-for="f in dateFilterOptions" :key="f" @click="dateFilter=f" :aria-pressed="dateFilter===f" class="rounded-lg px-3 py-1.5 text-xs font-medium capitalize" :class="dateFilter===f?'bg-orbyte-button text-white':'text-orbyte-muted hover:bg-orbyte-bg'">{{f==='week'?'This Week':f==='month'?'This Month':f}}</button></div>
 </div>
 <div v-if="dateFilter==='custom'" class="card flex flex-wrap gap-3 items-center p-3"><input aria-label="Reporting start date" v-model="customStart" type="date" class="form-input !mt-0 max-w-[180px]"/><span class="text-orbyte-muted">to</span><input aria-label="Reporting end date" v-model="customEnd" type="date" class="form-input !mt-0 max-w-[180px]"/></div>
 <div class="grid grid-cols-1 gap-4 sm:grid-cols-3"><div v-for="s in summary" :key="s.label" class="card p-4 hover:shadow-cardhover"><div class="mb-2 flex h-9 w-9 items-center justify-center rounded-xl" :style="{backgroundColor:s.color+'18'}"><component :is="s.icon" class="w-5 h-5" :style="{color:s.color}"/></div><p class="text-xs text-orbyte-muted">{{s.label}}</p><p class="text-xl font-bold mt-1 break-words">{{s.value}}</p><p class="text-[10px] text-orbyte-muted mt-1">{{s.note}}</p></div></div>
 <section class="card overflow-hidden"><div class="px-5 py-4 border-b border-orbyte-border"><h3 class="font-semibold">Needs your attention</h3><p class="text-xs text-orbyte-muted">Review payment claims, disputes, and follow-ups before sending reminders.</p></div>
 <div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead><tr class="border-b border-orbyte-border text-xs text-orbyte-muted"><th class="px-5 py-3">Customer</th><th class="px-5 py-3">Invoice</th><th class="px-5 py-3">Issue</th><th class="px-5 py-3">Queue urgency</th><th class="px-5 py-3">Recommended Action</th><th class="px-5 py-3">Action</th></tr></thead><tbody><tr v-for="a in priorityActions" :key="a.id+a.issue" class="border-b border-orbyte-border last:border-0 hover:bg-orbyte-bg/50"><td class="px-5 py-3 font-medium">{{a.customer}}</td><td class="px-5 py-3 text-orbyte-muted">{{a.number}}</td><td class="px-5 py-3 text-orbyte-muted">{{a.issue}}</td><td class="px-5 py-3"><span class="rounded-full px-2 py-1 text-[11px] font-medium" :class="a.priority==='High'?'bg-red-50 text-red-700':a.priority==='Medium'?'bg-amber-50 text-amber-700':'bg-blue-50 text-blue-700'">{{a.priority}}</span></td><td class="px-5 py-3 text-orbyte-muted">{{a.action}}</td><td class="px-5 py-3"><button class="outline-btn !py-1" @click="openInvoice(invoices.find(i=>i.id===a.id)!)">Review</button></td></tr><tr v-if="!priorityActions.length"><td colspan="6" class="p-5 text-center text-orbyte-muted">Nothing needs immediate attention.</td></tr></tbody></table></div></section>
 <section class="card overflow-hidden"><div class="border-b border-orbyte-border px-5 py-4"><h3 class="font-semibold">Invoices</h3></div>
 <div class="flex flex-col gap-3 px-5 py-3 sm:flex-row"><div class="relative flex-1"><Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orbyte-muted"/><input aria-label="Search invoices or customers" v-model="search" placeholder="Search invoice or customer..." class="form-input !mt-0 pl-9" /></div><select aria-label="Invoice status" v-model="statusFilter" class="form-input !mt-0 sm:w-auto"><option value="all">All Statuses</option><option value="paid">Paid</option><option value="pending">Pending</option><option value="overdue">Overdue</option></select><select aria-label="Sort invoices" v-model="sortBy" class="form-input !mt-0 sm:w-auto"><option value="dueDate">Sort: Due Date</option><option value="outstanding">Sort: Outstanding</option></select></div>
 <div class="overflow-x-auto"><table class="w-full text-sm text-left"><thead><tr class="border-b border-orbyte-border text-xs text-orbyte-muted"><th class="px-5 py-3">Invoice</th><th class="px-5 py-3">Customer</th><th class="px-5 py-3 text-right">Outstanding</th><th class="px-5 py-3">Due Date</th><th class="px-5 py-3">Status</th><th class="px-5 py-3">Action</th></tr></thead><tbody><tr v-for="i in pageData" :key="i.id" class="border-b border-orbyte-border last:border-0 cursor-pointer hover:bg-orbyte-bg/50" @click="openInvoice(i)"><td class="px-5 py-3 font-semibold">{{i.invoice_number}}</td><td class="px-5 py-3 text-orbyte-muted">{{i.customer?.name}}</td><td class="px-5 py-3 text-right font-medium">{{formatMYR(i.outstanding_balance)}}</td><td class="px-5 py-3 text-orbyte-muted">{{formatDate(i.due_date)}}</td><td class="px-5 py-3"><StatusBadge :status="i.status"/><span v-for="l in i.labels" :key="l" class="block mt-1 text-[10px] text-orbyte-muted">{{l}}</span></td><td class="px-5 py-3"><button class="inline-flex items-center gap-1 text-orbyte-button hover:underline text-xs" @click.stop="openInvoice(i)"><Eye class="w-4 h-4"/>View</button></td></tr><tr v-if="!pageData.length"><td colspan="6" class="p-6 text-center text-orbyte-muted">No invoices match your filters.</td></tr></tbody></table></div>
 <div class="flex items-center justify-between border-t border-orbyte-border px-5 py-3"><p class="text-xs text-orbyte-muted">Page {{Math.min(currentPage+1,pages)}} of {{pages}} · {{filtered.length}} invoices</p><div class="flex gap-1"><button aria-label="Previous page" class="outline-btn !p-2" :disabled="currentPage<=0" @click="currentPage--"><ChevronLeft class="w-4 h-4"/></button><button aria-label="Next page" class="outline-btn !p-2" :disabled="currentPage>=pages-1" @click="currentPage++"><ChevronRight class="w-4 h-4"/></button></div></div>
 </section>
 <details class="card overflow-hidden">
  <summary class="cursor-pointer px-5 py-4 font-semibold">Customer priorities <span class="ml-2 text-xs font-normal text-orbyte-muted">Payment history and supporting evidence</span></summary>
 <section class="card overflow-hidden">
  <div class="px-5 py-4 border-b border-orbyte-border flex flex-wrap items-start justify-between gap-3">
    <div><h3 class="font-semibold">Customer Follow-Up Priorities <span class="ml-2 rounded-md bg-blue-50 text-blue-700 px-2 py-0.5 text-xs">Rule-based</span></h3>
      <p class="text-xs text-orbyte-muted mt-1">Explainable, internal operational priorities — not credit scores. Does not override reminder approval.</p></div>
    <p class="text-xs text-orbyte-muted">As of {{today}} · MYT demo clock</p>
  </div>
  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 border-b border-orbyte-border">
    <div v-for="l in ['red','yellow','green','grey']" :key="l" class="rounded-xl bg-orbyte-bg/40 border border-orbyte-border px-3 py-2">
      <p class="text-xs font-medium capitalize">{{l==='grey'?'Insufficient history':l==='red'?'Needs attention':l==='yellow'?'Follow-up due':'Routine monitoring'}}</p>
      <p class="text-xl font-bold mt-1">{{priorityRecords.filter(p=>p.level===l).length}}</p>
    </div>
  </div>
  <div class="overflow-x-auto"><table class="w-full text-sm text-left"><thead><tr class="border-b border-orbyte-border text-xs text-orbyte-muted"><th class="px-5 py-3">Customer</th><th class="px-5 py-3">Priority</th><th class="px-5 py-3">Evidence-based reason</th><th class="px-5 py-3">Review flags</th><th class="px-5 py-3">Details</th></tr></thead>
   <tbody><template v-for="p in priorityList" :key="p.customerId"><tr class="border-b border-orbyte-border hover:bg-orbyte-bg/40">
     <td class="px-5 py-3 font-medium">{{p.customerName}}</td>
     <td class="px-5 py-3"><span class="rounded-full border px-2 py-1 text-xs font-semibold" :class="priorityBadge(p.level)">{{p.label}}</span></td>
     <td class="px-5 py-3 text-orbyte-muted max-w-[360px]">{{p.reason}}</td>
     <td class="px-5 py-3 text-xs"><span v-if="p.reviewFlags.length" class="text-amber-700 font-medium">Review required ({{p.reviewFlags.length}})</span><span v-else class="text-orbyte-muted">—</span></td>
     <td class="px-5 py-3"><button class="outline-btn !py-1 !text-xs" @click="expandedPriority=expandedPriority===p.customerId?null:p.customerId">{{expandedPriority===p.customerId?'Hide':'Explain'}}</button></td>
    </tr><tr v-if="expandedPriority===p.customerId" class="bg-orbyte-bg/50 border-b border-orbyte-border"><td colspan="5" class="px-5 py-4 text-xs space-y-2">
      <p><strong>Evidence invoice numbers:</strong> {{priorityInvoiceRefs(p)}}</p><p><strong>Last 5 eligible settled:</strong> {{p.settledCount}} · <strong>Paid late:</strong> {{p.lateCount}}</p>
      <p v-for="x in p.lastFiveSettled" :key="x.invoiceId" class="text-orbyte-muted">{{x.invoiceNumber}}: due {{x.dueDate}}, settled {{x.settledDate}} — {{x.late?`Late (${x.daysLate}d)`:'On time'}}</p>
      <p v-for="flag in p.reviewFlags" :key="flag" class="text-amber-800">⚠ {{flag}}</p>
      <p class="text-orbyte-muted">Calculation: {{p.calculatedAt}} · Rule version {{p.ruleVersion}} · Simulated records only</p>
    </td></tr></template></tbody></table></div>
 </section>
 </details>
 <details class="card overflow-hidden">
  <summary class="cursor-pointer px-5 py-4 font-semibold">Collection reports <span class="ml-2 text-xs font-normal text-orbyte-muted">Charts and overdue aging</span></summary>
  <div class="space-y-4 border-t border-orbyte-border p-4">
 <div class="grid grid-cols-1 gap-4 lg:grid-cols-2"><div class="card p-5"><h3 class="font-semibold">Invoice Status Distribution</h3><p class="text-xs text-orbyte-muted mb-4">Current snapshot</p><div class="h-[240px]"><Doughnut :data="statusChart" :options="chartOptions" /></div></div><div class="card p-5"><h3 class="font-semibold">Payment Collection Trend</h3><p class="text-xs text-orbyte-muted mb-4">Recorded payments over time</p><div class="h-[240px]"><Line :data="trendChart" :options="chartOptions"/></div></div></div>
 <section class="card p-5"><h3 class="font-semibold mb-4">Overdue Invoice Aging</h3><div class="grid grid-cols-2 gap-3 lg:grid-cols-4"><div v-for="b in aging" :key="b.label" class="rounded-xl border border-orbyte-border bg-orbyte-bg/30 p-4"><p class="text-xs text-orbyte-muted">{{b.label}}</p><p class="text-2xl font-bold mt-1">{{b.count}}</p><p class="text-sm text-orbyte-muted">{{formatMYR(b.amount)}}</p></div></div></section>
  </div>
 </details>
 <InvoiceDetailDrawer :invoice="selected" :open="drawerOpen" :seller-name="seller.name" :seller-role="seller.role" @close="drawerOpen=false"/>
</div>
</template>
